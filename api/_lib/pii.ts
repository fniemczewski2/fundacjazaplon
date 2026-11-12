// Szyfrowanie danych osobowych przechowywanych w bazie (AES-256-GCM). Klucz jest tylko w środowisku
// funkcji (AGREEMENTS_PII_KEY, 32 bajty w base64), baza nigdy go nie widzi.
// Plik celowo nie importuje innych modułów projektu: używa go też skrypt scripts/encrypt-existing-pesel.ts.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';

function key(): Buffer {
  const raw = process.env.AGREEMENTS_PII_KEY;
  if (!raw) throw new Error('Brak AGREEMENTS_PII_KEY (32 bajty w base64).');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length !== 32) throw new Error('AGREEMENTS_PII_KEY musi mieć 32 bajty w base64.');
  return bytes;
}

export const isEncrypted = (value: string): boolean => value.startsWith(PREFIX);

export function encryptPii(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
}

/** Wartości zapisane przed wdrożeniem szyfrowania (jawny tekst) zwraca bez zmian. */
export function decryptPii(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const [iv, tag, data] = stored.slice(PREFIX.length).split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !data) throw new Error('Uszkodzona wartość zaszyfrowana.');
  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
