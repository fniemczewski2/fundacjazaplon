import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RATE_LIMITS, type RateLimitName } from './config.js';
import { hashIp } from './agreements/security.js';
import { serviceClient, supabaseEnv } from './auth.js';
import { clientIp, sendJson, shorten, type ApiRequest } from './http.js';
import { logSecurityEvent } from './securityEvents.js';

/**
 * Sprawdza limit żądań dla adresu IP (licznik w bazie, funkcja check_rate_limit).
 * Zwraca true, gdy limit przekroczony, a odpowiedź 429 została już wysłana.
 * Przy awarii bazy żądanie przechodzi: formularze mają nie przestać działać z powodu licznika.
 */
export async function rateLimited(
  req: ApiRequest,
  res: ServerResponse,
  name: RateLimitName,
  db?: SupabaseClient,
): Promise<boolean> {
  const env = supabaseEnv();
  const client = db ?? (env ? serviceClient(env) : null);
  if (!client) return false;

  const { limit, windowSec } = RATE_LIMITS[name];
  try {
    const { data, error } = await client.rpc('check_rate_limit', {
      p_key: `${name}:${hashIp(clientIp(req))}`,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    if (error) throw error;
    if (data !== false) return false;
  } catch (err) {
    console.error(`rate-limit ${name}:`, shorten(err));
    return false;
  }

  await logSecurityEvent(client, req, 'rate_limited', { limiter: name });
  sendJson(res, 429, { error: 'Zbyt wiele prób. Spróbuj ponownie za jakiś czas.' }, { 'Retry-After': String(windowSec) });
  return true;
}
