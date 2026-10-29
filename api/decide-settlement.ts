import type { ServerResponse } from 'node:http';
import { authenticateAdmin } from './_lib/auth.js';
import { escapeHtml as esc, sendGraphMail } from './_lib/graph.js';
import { sendJson, shorten, type ApiRequest } from './_lib/http.js';

type Action = 'approve' | 'reject' | 'resend';
type DecidedStatus = 'accepted' | 'rejected';

export type MailRow = {
  email: string | null;
  purpose: string;
  amount_grosze: number;
};

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://zaplon.org.pl';
const NOTE_MAX = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: readonly Action[] = ['approve', 'reject', 'resend'];

const formatPln = (grosze: number) =>
  `${(grosze / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;

/** Treść wiadomości (HTML). Dane od użytkownika (cel, notatka) trafiają do HTML wyłącznie po escapowaniu. */
export function buildMail(row: MailRow, status: DecidedStatus, note: string | null) {
  const approved = status === 'accepted';
  const amount = formatPln(row.amount_grosze);
  const subject = `Rozliczenie faktury - ${approved ? 'zatwierdzone' : 'odrzucone'}`;
  const noteLabel = approved ? 'Uwagi' : 'Powód odrzucenia';

  const html = [
    '<p>Dzień dobry,</p>',
    `<p>${approved ? 'Twoje rozliczenie zostało <strong>zatwierdzone</strong>.' : 'Twoje rozliczenie zostało <strong>odrzucone</strong>.'}</p>`,
    `<p>Cel wydatku: ${esc(row.purpose)}<br>Kwota: ${esc(amount)}${note ? `<br>${noteLabel}: ${esc(note)}` : ''}</p>`,
    approved
      ? '<p>Zwrot zrealizujemy na rachunek wskazany w formularzu.</p>'
      : `<p>Możesz złożyć nowe rozliczenie z poprawionymi danymi: <a href="${esc(SITE_URL)}/rozliczenia">${esc(SITE_URL)}/rozliczenia</a></p>`,
    '<p>Fundacja „Zapłon”</p>',
  ].join('\n');

  return { subject, html };
}

async function sendDecisionMail(row: MailRow, status: DecidedStatus, note: string | null) {
  if (!row.email) throw new Error('Brak adresu e-mail w zgłoszeniu.');
  const { subject, html } = buildMail(row, status, note);
  await sendGraphMail({ to: row.email, subject, html });
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  // 1. Uwierzytelnienie administratora (token sesji + is_admin() + kontrola klucza service_role).
  const auth = await authenticateAdmin(req, res, 'decide-settlement').catch((err) => {
    console.error('decide-settlement auth error:', err);
    sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
    return null;
  });
  if (!auth) return;
  const { db, adminEmail } = auth;

  // 2. Walidacja danych wejściowych.
  const { id, action, note } = req.body ?? {};
  if (typeof id !== 'string' || !UUID_RE.test(id)) return sendJson(res, 400, { error: 'Nieprawidłowy identyfikator.' });
  if (typeof action !== 'string' || !ACTIONS.includes(action as Action)) {
    return sendJson(res, 400, { error: 'Nieprawidłowa akcja.' });
  }
  const cleanNote = typeof note === 'string' ? note.trim() : '';
  if (cleanNote.length > NOTE_MAX) return sendJson(res, 400, { error: `Notatka może mieć maksymalnie ${NOTE_MAX} znaków.` });
  if (action === 'reject' && cleanNote.length < 3) {
    return sendJson(res, 400, { error: 'Podaj powód odrzucenia (min. 3 znaki).' });
  }

  try {
    let status: DecidedStatus;
    let mailNote: string | null;
    let row: (MailRow & { id: string }) | null;

    if (action === 'resend') {
      const { data, error } = await db
        .from('settlements')
        .select('id, email, purpose, amount_grosze, status, decision_note, notified_at')
        .eq('id', id)
        .in('status', ['accepted', 'rejected'])
        .maybeSingle();
      if (error) throw error;
      if (!data) return sendJson(res, 404, { error: 'Nie znaleziono rozpatrzonego wniosku.' });
      if (data.notified_at) return sendJson(res, 409, { error: 'Powiadomienie zostało już wysłane.' });
      row = data as MailRow & { id: string };
      status = data.status as DecidedStatus;
      mailNote = (data.decision_note as string | null) ?? null;
    } else {
      status = action === 'approve' ? 'accepted' : 'rejected';
      mailNote = cleanNote || null;

      // 3. Atomowa zmiana statusu: tylko ze stanu 'new'. Drugi administrator dostanie 409.
      const { data, error } = await db
        .from('settlements')
        .update({
          status,
          decided_at: new Date().toISOString(),
          decided_by: adminEmail,
          decision_note: mailNote,
          notified_at: null,
          notify_error: null,
        })
        .eq('id', id)
        .eq('status', 'new')
        .select('id, email, purpose, amount_grosze')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: current } = await db.from('settlements').select('status').eq('id', id).maybeSingle();
        if (!current) return sendJson(res, 404, { error: 'Nie znaleziono wniosku.' });
        return sendJson(res, 409, { error: `Wniosek został już rozpatrzony (status: ${String(current.status)}).` });
      }
      row = data as MailRow & { id: string };
    }

    // 4. Powiadomienie. Decyzja jest już zapisana - błąd wysyłki jej nie cofa, tylko trafia do rekordu.
    try {
      await sendDecisionMail(row, status, mailNote);
      await db.from('settlements').update({ notified_at: new Date().toISOString(), notify_error: null }).eq('id', id);
      return sendJson(res, 200, { ok: true, emailSent: true });
    } catch (mailError) {
      const message = shorten(mailError);
      console.error('decide-settlement: wysyłka e-mail nie powiodła się:', message);
      await db.from('settlements').update({ notify_error: message }).eq('id', id);
      return sendJson(res, 200, { ok: true, emailSent: false, emailError: message });
    }
  } catch (err) {
    console.error('decide-settlement error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
