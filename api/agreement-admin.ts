import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authenticateAdmin } from './_lib/auth.js';
import { sendGraphMail } from './_lib/graph.js';
import { sendJson, sendPdf, shorten, type ApiRequest } from './_lib/http.js';
import { buildPackage, contentHash, templatesApproved, type AgreementRow } from './_lib/agreements/documents.js';
import { completedMail, invitationMail, rejectedMail } from './_lib/agreements/emails.js';
import { newToken, sha256Hex } from './_lib/agreements/security.js';
import {
  DAY_MS, downloadPdf, loadFoundation, logEvent, recipientOf, removeFile, SITE_URL, UUID_RE, uploadPdf, type FullRow,
} from './_lib/agreements/store.js';
import { validateTerms } from './_lib/agreements/validate.js';

const ACTIONS = ['approve', 'reject', 'resend-link', 'verify-krk', 'verify-rspts', 'delete-krk', 'cosign', 'preview'] as const;
type Action = (typeof ACTIONS)[number];

const INVITE_DAYS = 14;
const FINAL_LINK_DAYS = 30;

type Mail = { subject: string; html: string };

/** Wysyła wiadomość do wnioskodawcy; wynik zapisuje w rekordzie, błąd wysyłki nie cofa decyzji. */
async function notify(db: SupabaseClient, row: FullRow, mail: Mail, link: string | null) {
  try {
    await sendGraphMail({ to: recipientOf(row), subject: mail.subject, html: mail.html });
    await db.from('agreements').update({ last_email_error: null }).eq('id', row.id);
    return { emailSent: true as const };
  } catch (err) {
    const emailError = shorten(err);
    console.error('agreement-admin: wysyłka e-mail nie powiodła się:', emailError);
    await db.from('agreements').update({ last_email_error: emailError }).eq('id', row.id);
    // Link zwracamy administratorowi tylko wtedy, gdy mail nie wyszedł - może go przekazać ręcznie.
    return { emailSent: false as const, emailError, ...(link ? { link } : {}) };
  }
}

async function issueToken(db: SupabaseClient, id: string, days: number) {
  const { token, hash } = newToken();
  const expiresAt = new Date(Date.now() + days * DAY_MS);
  const { error } = await db.from('agreements').update({ token_hash: hash, token_expires_at: expiresAt.toISOString() }).eq('id', id);
  if (error) throw error;
  return { link: `${SITE_URL()}/umowa/${token}`, expiresAt };
}

async function approve(db: SupabaseClient, row: FullRow, body: any, adminEmail: string, res: ServerResponse) {
  if (row.status !== 'submitted') return sendJson(res, 409, { error: `Zgłoszenie ma już status: ${row.status}.` });

  const terms = validateTerms(row.kind, row.is_minor, body.terms);
  if ('error' in terms) return sendJson(res, 400, { error: terms.error });
  const t = terms.data;

  const { token, hash } = newToken();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * DAY_MS);
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('agreements')
    .update({
      status: 'approved', decided_at: now, decided_by: adminEmail, updated_at: now,
      conclusion_place: t.conclusionPlace, contract_number: t.contractNumber, scope: t.scope, start_date: t.startDate, end_date: t.endDate,
      rate_grosze: t.rateGrosze, costs_description: t.costsDescription, costs_days: t.costsDays, health_insurance_days: t.healthInsuranceDays,
      minors_checks_required: t.minorsChecksRequired,
      rep_name: t.repName, rep_role: t.repRole, rep_email: t.repEmail, rep2_name: t.rep2Name, rep2_role: t.rep2Role, rep2_email: t.rep2Email,
      token_hash: hash, token_expires_at: expiresAt.toISOString(), last_email_error: null,
    })
    .eq('id', row.id).eq('status', 'submitted').select('id').maybeSingle();
  if (error) throw error;
  if (!data) return sendJson(res, 409, { error: 'Zgłoszenie zostało już rozpatrzone.' });

  await logEvent(db, row.id, adminEmail, 'approved', { minorsChecksRequired: t.minorsChecksRequired, minor: row.is_minor });

  const link = `${SITE_URL()}/umowa/${token}`;
  const minorName = row.is_minor ? `${row.first_name} ${row.last_name}` : undefined;
  const result = await notify(db, row, invitationMail(link, expiresAt, t.minorsChecksRequired, minorName), link);
  return sendJson(res, 200, { ok: true, ...result });
}

async function reject(db: SupabaseClient, row: FullRow, body: any, adminEmail: string, res: ServerResponse) {
  if (!['submitted', 'approved'].includes(row.status)) return sendJson(res, 409, { error: `Zgłoszenie ma już status: ${row.status}.` });

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 1000) return sendJson(res, 400, { error: 'Notatka może mieć maksymalnie 1000 znaków.' });

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('agreements')
    .update({ status: 'rejected', decided_at: now, decided_by: adminEmail, decision_note: note || null, token_hash: null, token_expires_at: null, updated_at: now })
    .eq('id', row.id).eq('status', row.status).select('id').maybeSingle();
  if (error) throw error;
  if (!data) return sendJson(res, 409, { error: 'Zgłoszenie zostało już rozpatrzone.' });

  await logEvent(db, row.id, adminEmail, 'rejected');
  const result = await notify(db, row, rejectedMail(note || null), null);
  return sendJson(res, 200, { ok: true, ...result });
}

async function resendLink(db: SupabaseClient, row: FullRow, adminEmail: string, res: ServerResponse) {
  if (!['approved', 'signed', 'completed'].includes(row.status)) return sendJson(res, 409, { error: 'Dla tego zgłoszenia nie ma aktywnego linku.' });

  const days = row.status === 'approved' ? INVITE_DAYS : FINAL_LINK_DAYS;
  const { link, expiresAt } = await issueToken(db, row.id, days); // stary link przestaje działać
  await logEvent(db, row.id, adminEmail, 'link_resent');

  const minorName = row.is_minor ? `${row.first_name} ${row.last_name}` : undefined;
  const mail = row.status === 'approved' ? invitationMail(link, expiresAt, row.minors_checks_required, minorName) : completedMail(link, expiresAt);
  return sendJson(res, 200, { ok: true, ...(await notify(db, row, mail, link)) });
}

async function setVerification(
  db: SupabaseClient, row: FullRow, kind: 'krk' | 'rspts', adminEmail: string, res: ServerResponse,
) {
  if (!['approved', 'signed'].includes(row.status)) return sendJson(res, 409, { error: 'Weryfikację można zapisać tylko dla zgłoszeń, które nie zostały jeszcze zakończone.' });
  if (!row.minors_checks_required) return sendJson(res, 409, { error: 'Dla tego zgłoszenia weryfikacja nie jest wymagana.' });
  if (kind === 'krk' && !row.krk_file_path) return sendJson(res, 409, { error: 'Wnioskodawca nie dołączył jeszcze informacji z KRK.' });
  if (kind === 'rspts' && !row.consent_rspts) return sendJson(res, 409, { error: 'Wnioskodawca nie wyraził jeszcze zgody na weryfikację w rejestrze.' });

  const now = new Date().toISOString();
  const update = kind === 'krk'
    ? { krk_verified_at: now, krk_verified_by: adminEmail, updated_at: now }
    : { rspts_verified_at: now, rspts_verified_by: adminEmail, updated_at: now };
  const { error } = await db.from('agreements').update(update).eq('id', row.id);
  if (error) throw error;

  await logEvent(db, row.id, adminEmail, kind === 'krk' ? 'krk_verified' : 'rspts_verified');
  return sendJson(res, 200, { ok: true });
}

async function deleteKrk(db: SupabaseClient, row: FullRow, adminEmail: string, res: ServerResponse) {
  if (!row.krk_file_path) return sendJson(res, 409, { error: 'Brak pliku KRK do usunięcia.' });
  if (!row.krk_verified_at) return sendJson(res, 409, { error: 'Najpierw potwierdź weryfikację KRK.' });

  await removeFile(db, row.krk_file_path);
  const now = new Date().toISOString();
  const { error } = await db.from('agreements').update({ krk_file_path: null, krk_file_deleted_at: now, updated_at: now }).eq('id', row.id);
  if (error) throw error;

  await logEvent(db, row.id, adminEmail, 'krk_file_deleted');
  return sendJson(res, 200, { ok: true });
}

async function cosign(db: SupabaseClient, row: FullRow, adminEmail: string, res: ServerResponse) {
  if (row.status !== 'signed') return sendJson(res, 409, { error: 'Dokumenty nie czekają na podpis fundacji.' });

  if (row.minors_checks_required) {
    const missing = [
      ...(row.krk_verified_at ? [] : ['weryfikacja zaświadczenia z KRK']),
      ...(row.rspts_verified_at ? [] : ['weryfikacja w rejestrze']),
    ];
    if (missing.length) {
      return sendJson(res, 409, { error: `Nie można podpisać przed zakończeniem: ${missing.join(', ')}.` });
    }
  }

  // Za fundację podpisują dwie osoby, każda ze swojego konta. Konto musi pasować do osoby wskazanej w umowie.
  const email = adminEmail.toLowerCase();
  const slot = email === String(row.rep_email).toLowerCase() ? 1 : email === String(row.rep2_email).toLowerCase() ? 2 : 0;
  if (!slot) {
    return sendJson(res, 403, { error: 'Twoje konto nie jest przypisane do żadnej z osób reprezentujących fundację w tej umowie.' });
  }
  if (row[`cosign${slot}_at`]) return sendJson(res, 409, { error: 'Podpisałeś/aś już te dokumenty. Czekamy na drugą osobę.' });

  const foundation = await loadFoundation(db);
  // Treść nie mogła się zmienić po podpisie wnioskodawcy - skrót zapisany przy jego podpisie musi się zgadzać.
  if (row.content_sha256 !== contentHash(row as AgreementRow, foundation)) {
    return sendJson(res, 409, { error: 'Dane dokumentu zmieniły się po podpisie wnioskodawcy. Odrzuć zgłoszenie i poproś o nowe.' });
  }

  const now = new Date().toISOString();
  const { data: mine, error } = await db
    .from('agreements')
    .update({ [`cosign${slot}_at`]: now, [`cosign${slot}_by`]: adminEmail, updated_at: now })
    .eq('id', row.id).eq('status', 'signed').is(`cosign${slot}_at`, null).select('id').maybeSingle();
  if (error) throw error;
  if (!mine) return sendJson(res, 409, { error: 'Podpis został już zapisany albo dokumenty zmieniły status.' });
  await logEvent(db, row.id, adminEmail, 'cosigned', { slot });

  // Podpisały obie osoby? Ten, kto zapisał drugi podpis, kończy proces (atomowo - tylko jeden wygra).
  const { data: fresh, error: freshError } = await db.from('agreements').select('*').eq('id', row.id).maybeSingle();
  if (freshError) throw freshError;
  const current = fresh as FullRow;
  if (!current.cosign1_at || !current.cosign2_at) {
    const other = slot === 1 ? current.rep2_name : current.rep_name;
    return sendJson(res, 200, { ok: true, completed: false, waitingFor: other });
  }

  const completedAt = [current.cosign1_at, current.cosign2_at].sort().at(-1) as string;
  const pdf = await buildPackage({ ...current, countersigned_at: completedAt } as AgreementRow, foundation, current.content_sha256);
  const path = `final/${row.id}.pdf`;
  await uploadPdf(db, path, pdf);

  const { token, hash } = newToken();
  const expiresAt = new Date(Date.now() + FINAL_LINK_DAYS * DAY_MS);
  const { data: done, error: doneError } = await db
    .from('agreements')
    .update({
      status: 'completed', countersigned_at: completedAt, countersigned_by: [current.cosign1_by, current.cosign2_by].join(', '),
      signed_file_path: path, file_sha256: sha256Hex(pdf), token_hash: hash, token_expires_at: expiresAt.toISOString(), updated_at: now,
    })
    .eq('id', row.id).eq('status', 'signed').select('id').maybeSingle();
  if (doneError) throw doneError;
  if (!done) return sendJson(res, 200, { ok: true, completed: true });

  await logEvent(db, row.id, adminEmail, 'completed', { templatesApproved: templatesApproved() });

  const link = `${SITE_URL()}/umowa/${token}`;
  return sendJson(res, 200, { ok: true, completed: true, ...(await notify(db, current, completedMail(link, expiresAt), link)) });
}

async function preview(db: SupabaseClient, row: FullRow, res: ServerResponse) {
  if (row.signed_file_path) return sendPdf(res, await downloadPdf(db, row.signed_file_path), 'dokumenty.pdf');
  const foundation = await loadFoundation(db);
  return sendPdf(res, await buildPackage(row as AgreementRow, foundation, contentHash(row as AgreementRow, foundation)), 'dokumenty-podglad.pdf');
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const auth = await authenticateAdmin(req, res, 'agreement-admin').catch((err) => {
    console.error('agreement-admin auth error:', err);
    sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
    return null;
  });
  if (!auth) return;
  const { db, adminEmail } = auth;

  const body = req.body ?? {};
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return sendJson(res, 400, { error: 'Nieprawidłowy identyfikator.' });
  if (typeof body.action !== 'string' || !ACTIONS.includes(body.action as Action)) return sendJson(res, 400, { error: 'Nieprawidłowa akcja.' });

  try {
    const { data, error } = await db.from('agreements').select('*').eq('id', body.id).maybeSingle();
    if (error) throw error;
    if (!data) return sendJson(res, 404, { error: 'Nie znaleziono zgłoszenia.' });
    const row = data as FullRow;

    switch (body.action as Action) {
      case 'approve': return await approve(db, row, body, adminEmail, res);
      case 'reject': return await reject(db, row, body, adminEmail, res);
      case 'resend-link': return await resendLink(db, row, adminEmail, res);
      case 'verify-krk': return await setVerification(db, row, 'krk', adminEmail, res);
      case 'verify-rspts': return await setVerification(db, row, 'rspts', adminEmail, res);
      case 'delete-krk': return await deleteKrk(db, row, adminEmail, res);
      case 'cosign': return await cosign(db, row, adminEmail, res);
      default: return await preview(db, row, res);
    }
  } catch (err) {
    console.error('agreement-admin error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
