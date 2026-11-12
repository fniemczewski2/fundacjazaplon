import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient, supabaseEnv } from './auth.js';
import { clientIp, sendJson, shorten, type ApiRequest } from './http.js';
import { logSecurityEvent } from './securityEvents.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TOKEN_MAX = 2048;

let warned = false;

/** Weryfikuje token Cloudflare Turnstile. Bez TURNSTILE_SECRET_KEY weryfikacja jest wyłączona (z ostrzeżeniem w logach). */
export async function verifyCaptcha(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warned) console.error('captcha: brak TURNSTILE_SECRET_KEY, weryfikacja captcha jest wyłączona.');
    warned = true;
    return true;
  }
  if (typeof token !== 'string' || !token || token.length > TOKEN_MAX) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('captcha:', shorten(err));
    return false;
  }
}

/** Zwraca true, gdy captcha jest poprawna. W przeciwnym razie wysyła 400 i zwraca false. */
export async function requireCaptcha(
  req: ApiRequest,
  res: ServerResponse,
  token: unknown,
  db?: SupabaseClient,
): Promise<boolean> {
  if (await verifyCaptcha(token, clientIp(req))) return true;

  const env = supabaseEnv();
  await logSecurityEvent(db ?? (env ? serviceClient(env) : null), req, 'captcha_failed');
  sendJson(res, 400, { error: 'Potwierdź, że nie jesteś robotem, i spróbuj ponownie.' });
  return false;
}
