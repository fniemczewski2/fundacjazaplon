import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';

interface ApiRequest extends IncomingMessage {
  body?: any;
}

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

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

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

// --- Microsoft Graph (uwierzytelnianie aplikacji: client credentials) -------------------------
// Hosty domyślnie wskazują chmurę publiczną; MS_AUTHORITY_HOST / MS_GRAPH_HOST pozwalają je
// podmienić (chmury suwerenne, testy).
let cachedToken: { value: string; expiresAt: number } | null = null;

const firstLine = (value: unknown) => String(value ?? '').split(/\r?\n/)[0] ?? '';

async function getGraphToken(tenant: string, clientId: string, secret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const authority = process.env.MS_AUTHORITY_HOST || 'https://login.microsoftonline.com';
  const graph = process.env.MS_GRAPH_HOST || 'https://graph.microsoft.com';

  const res = await fetch(`${authority}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      scope: `${graph}/.default`,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const data: { access_token?: string; expires_in?: number | string; error?: string; error_description?: string } | null =
    await res.json().catch(() => null);

  if (!res.ok || !data?.access_token) {
    throw new Error(
      `Logowanie do Microsoft Graph nie powiodło się (${res.status}): ${firstLine(data?.error_description ?? data?.error) || 'brak szczegółów'}`,
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3000) * 1000,
  };
  return cachedToken.value;
}

async function sendDecisionMail(row: MailRow, status: DecidedStatus, note: string | null) {
  if (!row.email) throw new Error('Brak adresu e-mail w zgłoszeniu.');

  const tenant = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const secret = process.env.MS_CLIENT_SECRET;
  const sender = process.env.MAIL_SENDER;
  if (!tenant || !clientId || !secret || !sender) {
    throw new Error('Brak konfiguracji Microsoft Graph (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MAIL_SENDER).');
  }

  const graph = process.env.MS_GRAPH_HOST || 'https://graph.microsoft.com';
  const replyTo = process.env.MAIL_REPLY_TO;
  const { subject, html } = buildMail(row, status, note);

  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: row.email } }],
      ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
    },
    saveToSentItems: true,
  };

  // Jedna ponowna próba po 401 - token mógł zostać unieważniony przed upływem ważności.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getGraphToken(tenant, clientId, secret);
    const res = await fetch(`${graph}/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 202) return;
    if (res.status === 401 && attempt === 0) {
      cachedToken = null;
      continue;
    }

    const err: { error?: { code?: string; message?: string } } | null = await res.json().catch(() => null);
    throw new Error(
      `Microsoft Graph sendMail (${res.status}): ${[err?.error?.code, firstLine(err?.error?.message)].filter(Boolean).join(' - ')}`,
    );
  }
}

const shorten = (value: unknown, max = 300) =>
  (value instanceof Error ? value.message : String(value)).slice(0, max);

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    console.error('decide-settlement: brak SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.');
    return sendJson(res, 500, { error: 'Błąd konfiguracji serwera.' });
  }

  // 1. Uwierzytelnienie: token sesji + ta sama funkcja is_admin(), której używa RLS.
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return sendJson(res, 401, { error: 'Brak autoryzacji.' });

  const asUser = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await asUser.auth.getUser(token);
  const adminEmail = userData?.user?.email;
  if (userError || !adminEmail) return sendJson(res, 401, { error: 'Sesja wygasła. Zaloguj się ponownie.' });

  const { data: isAdmin, error: adminError } = await asUser.rpc('is_admin');
  if (adminError || isAdmin !== true) return sendJson(res, 403, { error: 'Brak uprawnień administratora.' });

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

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // Kontrola klucza: service_role omija RLS, więc musi widzieć tabelę admin_emails (RLS włączone,
    // brak polityk; administrator, który właśnie przeszedł is_admin(), jest w niej wpisany).
    // Klucz anon / publishable zwraca tu 0 wierszy, a UPDATE po cichu nie zmienia niczego.
    const { data: probe, error: probeError } = await db.from('admin_emails').select('email').limit(1);
    if (probeError) throw probeError;
    if (!probe || probe.length === 0) {
      console.error('decide-settlement: SUPABASE_SERVICE_ROLE_KEY nie omija RLS (klucz anon/publishable lub z innego projektu).');
      return sendJson(res, 500, {
        error: 'SUPABASE_SERVICE_ROLE_KEY nie omija RLS. Wklej klucz service_role / Secret key z tego samego projektu (nie anon / publishable).',
      });
    }

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
