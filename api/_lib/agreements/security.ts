import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const sha256Hex = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

/** Token dostępu do dokumentów: 256 bitów losowości. W bazie trzymamy wyłącznie skrót. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: sha256Hex(token) };
}

export const isTokenShape = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

/** Kod jednorazowy (6 cyfr). */
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

// Kod ma tylko 10^6 możliwości, więc skrót jest kluczowany sekretem serwera - wyciek bazy nie pozwala
// odtworzyć kodu offline.
const otpKey = () => process.env.AGREEMENTS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const hashOtp = (agreementId: string, code: string) =>
  createHmac('sha256', otpKey()).update(`${agreementId}:${code}`).digest('hex');

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
