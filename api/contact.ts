import type { ServerResponse } from 'node:http';
import { EMAIL_RE, MAX_EMAIL_LENGTH } from '../shared/validation.js';
import { serviceClient, supabaseEnv } from './_lib/auth.js';
import { requireCaptcha } from './_lib/captcha.js';
import { CONTACT_MESSAGE_MAX, FIELD_NAME_MAX } from './_lib/config.js';
import { escapeHtml, sendGraphMail } from './_lib/graph.js';
import { asString, bodyOf, sendJson, shorten, type ApiRequest } from './_lib/http.js';
import { rateLimited } from './_lib/rateLimit.js';

const DEFAULT_RECIPIENT = 'biuro@zaplon.org.pl';
const MIN_MESSAGE_LENGTH = 5;

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const body = bodyOf(req);
  const name = asString(body.name, FIELD_NAME_MAX);
  const email = asString(body.email, MAX_EMAIL_LENGTH + 1);
  const message = asString(body.message, CONTACT_MESSAGE_MAX + 1);

  if (!name) return sendJson(res, 400, { error: 'Podaj imię i nazwisko.' });
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LENGTH) return sendJson(res, 400, { error: 'Podaj poprawny adres e-mail.' });
  if (message.length < MIN_MESSAGE_LENGTH) return sendJson(res, 400, { error: 'Napisz kilka słów wiadomości.' });
  if (message.length > CONTACT_MESSAGE_MAX) return sendJson(res, 400, { error: `Wiadomość może mieć maksymalnie ${CONTACT_MESSAGE_MAX} znaków.` });

  // Pole-pułapka: człowiek go nie widzi. Botowi udajemy sukces.
  if (typeof body.website === 'string' && body.website) return sendJson(res, 200, { ok: true });

  const env = supabaseEnv();
  const db = env ? serviceClient(env) : undefined;
  if (await rateLimited(req, res, 'contact', db)) return;
  if (!(await requireCaptcha(req, res, body.captchaToken, db))) return;

  try {
    await sendGraphMail({
      to: process.env.CONTACT_RECIPIENT || DEFAULT_RECIPIENT,
      replyTo: email,
      subject: 'Nowa wiadomość z formularza kontaktowego',
      html: [
        `<p><strong>Od:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>`,
        `<p>${escapeHtml(message).replaceAll('\n', '<br>')}</p>`,
      ].join('\n'),
    });
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('contact: wysyłka nie powiodła się:', shorten(err));
    return sendJson(res, 502, { error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.' });
  }
}
