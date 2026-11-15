import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RATE_LIMITS, type RateLimitName } from './config.js';
import { hashIp } from './agreements/security.js';
import { clientIp, sendJson, shorten, type ApiRequest } from './http.js';
import { incrementWindow } from './redis.js';
import { logSecurityEvent } from './securityEvents.js';

export const UNAVAILABLE_MESSAGE = 'Usługa jest chwilowo niedostępna. Spróbuj ponownie za chwilę.';

/**
 * Sprawdza limit żądań dla adresu IP (licznik w Upstash Redis, okno stałe).
 * Zwraca true, gdy żądanie zostało już odrzucone: 429 przy przekroczeniu limitu albo 503, gdy Redis nie działa
 * (fail-closed: bez licznika nie wpuszczamy żądań publicznych).
 */
export async function rateLimited(
  req: ApiRequest,
  res: ServerResponse,
  name: RateLimitName,
  db?: SupabaseClient,
): Promise<boolean> {
  const { limit, windowSec } = RATE_LIMITS[name];
  let ttlSec: number = windowSec;
  try {
    const result = await incrementWindow(`rl:${name}:${hashIp(clientIp(req))}`, windowSec);
    if (result.count <= limit) return false;
    ttlSec = Math.max(result.ttlSec, 1);
  } catch (err) {
    console.error(`rate-limit ${name}:`, shorten(err));
    sendJson(res, 503, { error: UNAVAILABLE_MESSAGE }, { 'Retry-After': '30' });
    return true;
  }

  await logSecurityEvent(db ?? null, req, 'rate_limited', { limiter: name });
  sendJson(res, 429, { error: 'Zbyt wiele prób. Spróbuj ponownie za jakiś czas.' }, { 'Retry-After': String(ttlSec) });
  return true;
}
