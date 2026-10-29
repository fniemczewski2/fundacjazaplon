import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient, supabaseEnv } from './_lib/auth.js';
import { sendGraphMail } from './_lib/graph.js';
import { clientIp, sendJson, sendPdf, shorten, type ApiRequest } from './_lib/http.js';
import { buildPackage, contentHash, templatesApproved, TEMPLATE_VERSION, type AgreementRow } from './_lib/agreements/documents.js';
import { otpMail } from './_lib/agreements/emails.js';
import { hashOtp, isTokenShape, newOtp, safeEqualHex, sha256Hex } from './_lib/agreements/security.js';
import { downloadPdf, loadFoundation, logEvent, recipientOf, uploadPdf, type FullRow } from './_lib/agreements/store.js';
import {
  decodeKrkFile, validateApplication, validateDeclarations, validateKrkDate, validateStatement,
} from './_lib/agreements/validate.js';

const OTP_TTL_MS = 10 * 60_000;
const OTP_COOLDOWN_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;
const LINK_ERROR = 'Link jest nieprawidłowy lub wygasł. Poproś fundację o nowy.';

const maskEmail = (email: string) => {
  const [name = '', domain = ''] = email.split('@');
  return `${name.slice(0, 1)}***@${domain}`;
};

function viewOf(row: FullRow) {
  return {
    kind: row.kind,
    status: row.status,
    isMinor: row.is_minor,
    firstName: row.first_name,
    lastName: row.last_name,
    signerName: row.is_minor ? `${row.guardian_first_name} ${row.guardian_last_name}` : `${row.first_name} ${row.last_name}`,
    guardianRelation: row.guardian_relation,
    emailMasked: maskEmail(recipientOf(row)),
    scope: row.scope,
    startDate: row.start_date,
    endDate: row.end_date,
    contractNumber: row.contract_number,
    rateGrosze: row.rate_grosze,
    costsDescription: row.costs_description,
    costsDays: row.costs_days,
    healthInsuranceDays: row.health_insurance_days,
    minorsChecksRequired: row.minors_checks_required,
    street: row.street,
    houseNumber: row.house_number,
    postalCode: row.postal_code,
    city: row.city,
    email: row.email,
    consentsSaved: Boolean(row.consents_saved_at),
    consentImage: row.consent_image,
    consentRspts: row.consent_rspts,
    marketingConsent: row.marketing_consent,
    declarations: row.declarations,
    statement: row.contractor_statement,
    krkUploaded: Boolean(row.krk_file_path),
    krkIssueDate: row.krk_issue_date,
    otpSentAt: row.otp_sent_at,
    signedAt: row.signed_at,
    countersignedAt: row.countersigned_at,
    templatesApproved: templatesApproved(),
  };
}

async function loadByToken(db: SupabaseClient, token: string): Promise<FullRow | null> {
  const { data, error } = await db.from('agreements').select('*').eq('token_hash', sha256Hex(token)).maybeSingle();
  if (error) throw error;
  const row = data as FullRow | null;
  if (!row || !row.token_expires_at || new Date(row.token_expires_at).getTime() < Date.now()) return null;
  if (!['approved', 'signed', 'completed'].includes(row.status)) return null;
  return row;
}

// --- zgłoszenie ------------------------------------------------------------------------------------

async function submit(db: SupabaseClient, body: any, res: ServerResponse) {
  // Pole-pułapka: człowiek go nie widzi. Botowi udajemy sukces.
  if (typeof body.website === 'string' && body.website) return sendJson(res, 200, { ok: true });

  const result = validateApplication(body);
  if ('error' in result) return sendJson(res, 400, { error: result.error });
  const a = result.data;

  const id = crypto.randomUUID();
  const { error } = await db.from('agreements').insert({
    id, kind: a.kind, first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
    pesel: a.pesel, birth_date: a.birthDate, is_minor: a.isMinor,
    street: a.street, house_number: a.houseNumber, postal_code: a.postalCode, city: a.city, note: a.note,
    ...(a.guardian
      ? {
          guardian_first_name: a.guardian.firstName, guardian_last_name: a.guardian.lastName, guardian_email: a.guardian.email,
          guardian_phone: a.guardian.phone, guardian_relation: a.guardian.relation,
        }
      : {}),
  });
  if (error) throw error;

  await logEvent(db, id, a.isMinor ? 'rodzic / opiekun (w imieniu małoletniego)' : 'wnioskodawca', 'submitted', { minor: a.isMinor });
  return sendJson(res, 200, { ok: true });
}

// --- zgody, KRK ------------------------------------------------------------------------------------

async function save(db: SupabaseClient, row: FullRow, body: any, res: ServerResponse) {
  if (row.status !== 'approved') return sendJson(res, 409, { error: 'Dokumenty zostały już podpisane.' });

  if (typeof body.marketingConsent !== 'boolean') return sendJson(res, 400, { error: 'Wskaż, czy wyrażasz zgodę na informowanie o działaniach fundacji (zgoda jest dobrowolna).' });
  if (body.infoClauseAck !== true) return sendJson(res, 400, { error: 'Potwierdź zapoznanie się z klauzulą informacyjną.' });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    marketing_consent: body.marketingConsent,
    info_clause_ack_at: now,
    consents_saved_at: now,
    // Zmiana zgód unieważnia zamówiony kod - podpisujemy dokładnie to, co jest zapisane.
    otp_hash: null, otp_expires_at: null,
    updated_at: now,
  };

  if (row.kind === 'volunteer') {
    if (typeof body.consentImage !== 'boolean') return sendJson(res, 400, { error: 'Wskaż, czy wyrażasz zgodę na wykorzystanie wizerunku.' });
    const declarations = validateDeclarations(body);
    if ('error' in declarations) return sendJson(res, 400, { error: declarations.error });
    update.consent_image = body.consentImage;
    update.declarations = declarations.data;
  } else {
    const statement = validateStatement(body.statement);
    if ('error' in statement) return sendJson(res, 400, { error: statement.error });
    update.contractor_statement = statement.data;
    update.consent_image = null;
  }

  let krkBytes: Buffer | null = null;
  if (row.minors_checks_required) {
    if (body.consentRspts !== true) return sendJson(res, 400, { error: 'Zgoda na weryfikację w rejestrze jest warunkiem współpracy z małoletnimi.' });
    update.consent_rspts = true;

    const date = validateKrkDate(body.krkIssueDate);
    if ('error' in date) return sendJson(res, 400, { error: date.error });
    update.krk_issue_date = date.data;

    if (body.krkFileBase64) {
      const file = decodeKrkFile(body.krkFileBase64);
      if ('error' in file) return sendJson(res, 400, { error: file.error });
      krkBytes = file.data;
    } else if (!row.krk_file_path) {
      return sendJson(res, 400, { error: 'Dołącz zaświadczenie o niekaralności z KRK w formacie PDF.' });
    }
  } else {
    update.consent_rspts = null;
  }

  if (krkBytes) {
    const path = `krk/${row.id}.pdf`;
    await uploadPdf(db, path, krkBytes);
    Object.assign(update, { krk_file_path: path, krk_uploaded_at: now, krk_verified_at: null, krk_verified_by: null, krk_file_deleted_at: null });
  }

  const { data, error } = await db.from('agreements').update(update).eq('id', row.id).eq('status', 'approved').select('id').maybeSingle();
  if (error) throw error;
  if (!data) return sendJson(res, 409, { error: 'Dokumenty zostały już podpisane.' });

  await logEvent(db, row.id, row.is_minor ? 'rodzic / opiekun' : 'wnioskodawca', 'consents_saved', { krkUploaded: Boolean(krkBytes) });
  return sendJson(res, 200, { ok: true });
}

// --- podpis ----------------------------------------------------------------------------------------

async function sendOtp(db: SupabaseClient, row: FullRow, res: ServerResponse) {
  if (row.status !== 'approved') return sendJson(res, 409, { error: 'Dokumenty zostały już podpisane.' });
  if (!row.consents_saved_at) return sendJson(res, 409, { error: 'Najpierw zapisz zgody i oświadczenia.' });

  if (row.otp_sent_at && Date.now() - new Date(row.otp_sent_at).getTime() < OTP_COOLDOWN_MS) {
    return sendJson(res, 429, { error: 'Kod został wysłany przed chwilą. Odczekaj minutę przed kolejną próbą.' });
  }

  const code = newOtp();
  const { data, error } = await db
    .from('agreements')
    .update({
      otp_hash: hashOtp(row.id, code), otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      otp_attempts: 0, otp_sent_at: new Date().toISOString(),
    })
    .eq('id', row.id).eq('status', 'approved').select('id').maybeSingle();
  if (error) throw error;
  if (!data) return sendJson(res, 409, { error: 'Dokumenty zostały już podpisane.' });

  try {
    const mail = otpMail(code);
    await sendGraphMail({ to: recipientOf(row), subject: mail.subject, html: mail.html });
  } catch (err) {
    console.error('agreement-public: wysyłka kodu nie powiodła się:', shorten(err));
    return sendJson(res, 502, { error: 'Nie udało się wysłać kodu. Spróbuj ponownie za chwilę.' });
  }

  await logEvent(db, row.id, 'osoba podpisująca', 'otp_sent');
  return sendJson(res, 200, { ok: true });
}

async function sign(db: SupabaseClient, row: FullRow, body: any, req: ApiRequest, res: ServerResponse) {
  if (row.status !== 'approved') return sendJson(res, 409, { error: 'Dokumenty zostały już podpisane.' });
  if (!row.consents_saved_at) return sendJson(res, 409, { error: 'Najpierw zapisz zgody i oświadczenia.' });
  if (body.accept !== true) return sendJson(res, 400, { error: 'Potwierdź, że zapoznałeś/aś się z dokumentami i je podpisujesz.' });

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) return sendJson(res, 400, { error: 'Podaj 6-cyfrowy kod z wiadomości e-mail.' });

  if (!row.otp_hash || !row.otp_expires_at || new Date(row.otp_expires_at).getTime() < Date.now()) {
    return sendJson(res, 400, { error: 'Kod wygasł albo nie został zamówiony. Poproś o nowy kod.' });
  }
  if (row.otp_attempts >= OTP_MAX_ATTEMPTS) {
    return sendJson(res, 429, { error: 'Zbyt wiele błędnych prób. Poproś o nowy kod.' });
  }

  if (!safeEqualHex(hashOtp(row.id, code), row.otp_hash)) {
    await db.from('agreements').update({ otp_attempts: row.otp_attempts + 1 }).eq('id', row.id);
    await logEvent(db, row.id, 'osoba podpisująca', 'otp_failed');
    const left = OTP_MAX_ATTEMPTS - row.otp_attempts - 1;
    return sendJson(res, 400, { error: `Nieprawidłowy kod. Pozostało prób: ${Math.max(left, 0)}.` });
  }

  if (row.minors_checks_required && (!row.krk_file_path || !row.consent_rspts)) {
    return sendJson(res, 409, { error: 'Brakuje zaświadczenia z KRK lub zgody na weryfikację w rejestrze.' });
  }

  const foundation = await loadFoundation(db);
  const signedAt = new Date().toISOString();
  const ip = clientIp(req);
  const hash = contentHash(row as AgreementRow, foundation);
  const pdf = await buildPackage({ ...row, signed_at: signedAt, signed_ip: ip } as AgreementRow, foundation, hash);

  const path = `signed/${row.id}.pdf`;
  await uploadPdf(db, path, pdf);

  const { data, error } = await db
    .from('agreements')
    .update({
      status: 'signed', signed_at: signedAt, signed_ip: ip, signed_ua: String(req.headers['user-agent'] ?? '').slice(0, 300),
      content_sha256: hash, signed_file_path: path, file_sha256: sha256Hex(pdf),
      template_version: TEMPLATE_VERSION, template_approved: templatesApproved(),
      otp_hash: null, otp_expires_at: null, updated_at: signedAt,
    })
    .eq('id', row.id).eq('status', 'approved').select('id').maybeSingle();
  if (error) throw error;
  if (!data) return sendJson(res, 409, { error: 'Dokumenty zostały już podpisane.' });

  await logEvent(db, row.id, 'osoba podpisująca', 'signed', { ip, contentSha256: hash });
  return sendJson(res, 200, { ok: true });
}

// --- obsługa ---------------------------------------------------------------------------------------

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const env = supabaseEnv();
  if (!env) {
    console.error('agreement-public: brak SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.');
    return sendJson(res, 500, { error: 'Błąd konfiguracji serwera.' });
  }
  const db = serviceClient(env);
  const body = req.body ?? {};

  try {
    if (body.action === 'submit') return await submit(db, body, res);

    if (!['get', 'preview', 'save', 'otp', 'sign'].includes(body.action)) {
      return sendJson(res, 400, { error: 'Nieprawidłowa akcja.' });
    }
    if (!isTokenShape(body.token)) return sendJson(res, 404, { error: LINK_ERROR });

    const row = await loadByToken(db, body.token);
    if (!row) return sendJson(res, 404, { error: LINK_ERROR });

    switch (body.action) {
      case 'get':
        return sendJson(res, 200, viewOf(row));
      case 'preview': {
        if (row.signed_file_path) return sendPdf(res, await downloadPdf(db, row.signed_file_path), 'dokumenty.pdf');
        const foundation = await loadFoundation(db);
        const hash = contentHash(row as AgreementRow, foundation);
        return sendPdf(res, await buildPackage(row as AgreementRow, foundation, hash), 'dokumenty-do-podpisu.pdf');
      }
      case 'save':
        return await save(db, row, body, res);
      case 'otp':
        return await sendOtp(db, row, res);
      default:
        return await sign(db, row, body, req, res);
    }
  } catch (err) {
    console.error('agreement-public error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
