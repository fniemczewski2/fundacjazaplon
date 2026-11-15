import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptPii, encryptPii, isEncrypted } from './pii';

afterEach(() => vi.unstubAllEnvs());

describe('PII (AES-256-GCM)', () => {
  it('szyfruje i deszyfruje (w tym znaki spoza ASCII)', () => {
    const plain = '44051401359 Zażółć gęślą jaźń';
    const stored = encryptPii(plain);
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain('44051401359');
    expect(decryptPii(stored)).toBe(plain);
  });

  it('ten sam tekst daje różne szyfrogramy (losowy IV)', () => {
    expect(encryptPii('x')).not.toBe(encryptPii('x'));
  });

  it('jawny tekst sprzed wdrożenia szyfrowania jest zwracany bez zmian', () => {
    expect(decryptPii('44051401359')).toBe('44051401359');
  });

  it('wykrywa modyfikację szyfrogramu (tag GCM)', () => {
    const stored = encryptPii('tajne');
    const tampered = `${stored.slice(0, -2)}${stored.endsWith('AA') ? 'BB' : 'AA'}`;
    expect(() => decryptPii(tampered)).toThrow();
  });

  it('odrzuca uszkodzoną wartość', () => {
    expect(() => decryptPii('enc:v1:abc')).toThrow('Uszkodzona');
  });

  it('wymaga klucza 32 bajty w base64', () => {
    vi.stubEnv('AGREEMENTS_PII_KEY', '');
    expect(() => encryptPii('x')).toThrow('Brak AGREEMENTS_PII_KEY');
    vi.stubEnv('AGREEMENTS_PII_KEY', Buffer.alloc(16).toString('base64'));
    expect(() => encryptPii('x')).toThrow('32 bajty');
  });

  it('inny klucz nie odszyfruje danych', () => {
    const stored = encryptPii('tajne');
    vi.stubEnv('AGREEMENTS_PII_KEY', Buffer.alloc(32, 1).toString('base64'));
    expect(() => decryptPii(stored)).toThrow();
  });
});
