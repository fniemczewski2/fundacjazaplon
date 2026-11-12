import type { SupabaseClient } from '@supabase/supabase-js';
import { hashIp } from './agreements/security.js';
import { clientIp, shorten, type ApiRequest, type JsonObject } from './http.js';

export type SecurityEventType =
  | 'rate_limited'
  | 'captcha_failed'
  | 'invalid_token'
  | 'otp_exhausted'
  | 'bad_ticket'
  | 'invalid_file_url';

/** Zapisuje zdarzenie istotne dla bezpieczeństwa. Błąd zapisu nigdy nie przerywa obsługi żądania. */
export async function logSecurityEvent(
  db: SupabaseClient | null,
  req: ApiRequest,
  type: SecurityEventType,
  details: JsonObject = {},
): Promise<void> {
  if (!db) return;
  try {
    const { error } = await db.from('security_events').insert({ type, ip_hash: hashIp(clientIp(req)), details });
    if (error) console.error('security_events:', error.message);
  } catch (err) {
    console.error('security_events:', shorten(err));
  }
}
