import type { ServerResponse } from 'node:http';
import { EMAIL_RE, MAX_EMAIL_LENGTH } from '../shared/validation.js';
import { requireCaptcha } from './_lib/captcha.js';
import { FILE_TITLE_MAX, FILE_URL_MAX, FIELD_NAME_MAX, siteUrl } from './_lib/config.js';
import { asString, bodyOf, sendJson, type ApiRequest } from './_lib/http.js';
import { subscribeToMailerLite } from './_lib/mailerlite.js';
import { rateLimited } from './_lib/rateLimit.js';
import { serviceClient, supabaseEnv } from './_lib/auth.js';
import { logSecurityEvent } from './_lib/securityEvents.js';

/** Adresy plików, które wolno zapisać w polu MailerLite: własna strona i publiczny storage Supabase. */
function allowedFileHosts(): string[] {
  const hosts = [new URL(siteUrl()).host];
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (supabaseUrl) hosts.push(new URL(supabaseUrl).host);
  return hosts;
}

function isAllowedFileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedFileHosts().includes(url.host);
  } catch {
    return false;
  }
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const body = bodyOf(req);
  const email = asString(body.email, MAX_EMAIL_LENGTH + 1);
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LENGTH) {
    return sendJson(res, 400, { error: 'Podaj prawidłowy adres e-mail.' });
  }

  const env = supabaseEnv();
  const db = env ? serviceClient(env) : undefined;

  if (await rateLimited(req, res, 'newsletter', db)) return;
  if (!(await requireCaptcha(req, res, body.captchaToken, db))) return;

  const fileUrl = asString(body.file_url, FILE_URL_MAX);
  if (fileUrl && !isAllowedFileUrl(fileUrl)) {
    await logSecurityEvent(db ?? null, req, 'invalid_file_url', { host: fileUrl.slice(0, 80) });
    return sendJson(res, 400, { error: 'Nieprawidłowy adres pliku.' });
  }

  try {
    const materialsGroup = fileUrl ? process.env.MAILERLITE_MATERIALS_GROUP_ID : undefined;
    const response = await subscribeToMailerLite({
      email,
      name: asString(body.name, FIELD_NAME_MAX),
      fields: fileUrl
        ? { ostatni_plik_url: fileUrl, ostatni_plik_tytul: asString(body.file_title, FILE_TITLE_MAX) }
        : {},
      groups: [process.env.MAILERLITE_GROUP_ID, materialsGroup],
    });

    if (!response.ok) {
      console.error('MailerLite error:', response.status, await response.text());
      return sendJson(res, 502, { error: 'Wystąpił błąd po stronie serwera.' });
    }
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error('subscribe-newsletter error:', error);
    return sendJson(res, 500, { error: 'Wewnętrzny błąd serwera.' });
  }
}
