import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_EMAIL_LENGTH,
  UUID_RE,
  normalizeIban,
  parseAmountToGrosze,
  validateSettlementFields,
  type InvoiceKind,
} from '../shared/validation.js';
import { newTicket, readTicket } from './_lib/agreements/security.js';
import { serviceClient, supabaseEnv } from './_lib/auth.js';
import { requireCaptcha } from './_lib/captcha.js';
import { SETTLEMENT_BUCKET, SETTLEMENT_TICKET_TTL_MS } from './_lib/config.js';
import { asString, bodyOf, sendJson, shorten, type ApiRequest, type JsonObject } from './_lib/http.js';
import { rateLimited } from './_lib/rateLimit.js';
import { logSecurityEvent } from './_lib/securityEvents.js';

const PDF_MAGIC = '%PDF-';
const KINDS: readonly InvoiceKind[] = ['pdf', 'ksef'];
const FIELD_MAX = 600;

const isKind = (value: unknown): value is InvoiceKind => KINDS.includes(value as InvoiceKind);

// Krok 1: po weryfikacji captcha wydajemy bilet i, dla faktury PDF, jednorazowy adres wysyłki pliku.
async function prepare(req: ApiRequest, res: ServerResponse, db: SupabaseClient, body: JsonObject) {
  if (!isKind(body.kind)) return sendJson(res, 400, { error: 'Nieprawidłowy rodzaj faktury.' });
  if (await rateLimited(req, res, 'settlementPrepare', db)) return;
  if (!(await requireCaptcha(req, res, body.captchaToken, db))) return;

  const id = crypto.randomUUID();
  const ticket = newTicket(id, body.kind, SETTLEMENT_TICKET_TTL_MS);
  if (body.kind === 'ksef') return sendJson(res, 200, { ticket });

  const { data, error } = await db.storage.from(SETTLEMENT_BUCKET).createSignedUploadUrl(`${id}.pdf`);
  if (error || !data) throw error ?? new Error('Nie udało się przygotować wysyłki pliku.');
  return sendJson(res, 200, { ticket, upload: { path: data.path, token: data.token } });
}

async function discardFile(db: SupabaseClient, id: string) {
  const { error } = await db.storage.from(SETTLEMENT_BUCKET).remove([`${id}.pdf`]);
  if (error) console.error('submit-settlement: nie usunięto pliku:', error.message);
}

// Krok 2: zapis rozliczenia. Plik musi istnieć, być PDF-em, a przy błędzie zapisu jest usuwany.
async function commit(req: ApiRequest, res: ServerResponse, db: SupabaseClient, body: JsonObject) {
  if (await rateLimited(req, res, 'settlementCommit', db)) return;

  const ticket = readTicket(body.ticket);
  if (!ticket || !UUID_RE.test(ticket.id) || ticket.kind !== body.kind || !isKind(body.kind)) {
    await logSecurityEvent(db, req, 'bad_ticket');
    return sendJson(res, 400, { error: 'Sesja formularza wygasła. Odśwież stronę i spróbuj ponownie.' });
  }
  const { id } = ticket;
  const kind: InvoiceKind = body.kind;

  const fields = {
    firstName: asString(body.firstName, FIELD_MAX),
    lastName: asString(body.lastName, FIELD_MAX),
    email: asString(body.email, MAX_EMAIL_LENGTH + 1),
    purpose: asString(body.purpose, FIELD_MAX),
    iban: asString(body.iban, FIELD_MAX),
    amount: asString(body.amount, FIELD_MAX),
    kind,
    ksef: asString(body.ksef, FIELD_MAX),
  };

  const found = validateSettlementFields(fields);
  const firstError = Object.values(found)[0];
  if (firstError) {
    if (kind === 'pdf') await discardFile(db, id);
    return sendJson(res, 400, { error: firstError });
  }

  if (typeof body.website === 'string' && body.website) {
    if (kind === 'pdf') await discardFile(db, id);
    return sendJson(res, 200, { ok: true });
  }

  if (kind === 'pdf') {
    const { data: file, error: downloadError } = await db.storage.from(SETTLEMENT_BUCKET).download(`${id}.pdf`);
    if (downloadError || !file) return sendJson(res, 400, { error: 'Nie znaleziono wysłanego pliku faktury.' });
    if ((await file.slice(0, PDF_MAGIC.length).text()) !== PDF_MAGIC) {
      await discardFile(db, id);
      return sendJson(res, 400, { error: 'Plik nie jest prawidłowym dokumentem PDF.' });
    }
  }

  const grosze = parseAmountToGrosze(fields.amount);
  const { error } = await db.from('settlements').insert({
    id,
    first_name: fields.firstName,
    last_name: fields.lastName,
    email: fields.email.toLowerCase(),
    purpose: fields.purpose,
    iban: normalizeIban(fields.iban),
    amount_grosze: grosze,
    invoice_kind: kind,
    ksef_number: kind === 'ksef' ? fields.ksef.toUpperCase() : null,
    file_path: kind === 'pdf' ? `${id}.pdf` : null,
  });

  if (error) {
    if (error.code === '23505') return sendJson(res, 409, { error: 'To rozliczenie zostało już wysłane.' });
    if (kind === 'pdf') await discardFile(db, id);
    throw error;
  }
  return sendJson(res, 200, { ok: true });
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const env = supabaseEnv();
  if (!env) {
    console.error('submit-settlement: brak SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.');
    return sendJson(res, 500, { error: 'Błąd konfiguracji serwera.' });
  }
  const db = serviceClient(env);
  const body = bodyOf(req);

  try {
    if (body.action === 'prepare') return await prepare(req, res, db, body);
    if (body.action === 'commit') return await commit(req, res, db, body);
    return sendJson(res, 400, { error: 'Nieprawidłowa akcja.' });
  } catch (err) {
    console.error('submit-settlement error:', shorten(err));
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
