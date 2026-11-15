import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hashIp,
  hashOtp,
  isTokenShape,
  newOtp,
  newTicket,
  newToken,
  readTicket,
  safeEqualHex,
  sha256Hex,
} from './security';

afterEach(() => vi.useRealTimers());

describe('newToken', () => {
  it('token ma 43 znaki base64url, a skrót to sha256 tokenu', () => {
    const { token, hash } = newToken();
    expect(isTokenShape(token)).toBe(true);
    expect(hash).toBe(sha256Hex(token));
  });

  it('kolejne tokeny są różne', () => {
    expect(newToken().token).not.toBe(newToken().token);
  });
});

describe('isTokenShape', () => {
  it('odrzuca zły kształt i typ', () => {
    expect(isTokenShape('krótki')).toBe(false);
    expect(isTokenShape('a'.repeat(44))).toBe(false);
    expect(isTokenShape(`${'a'.repeat(42)}!`)).toBe(false);
    expect(isTokenShape(null)).toBe(false);
  });
});

describe('OTP', () => {
  it('newOtp zwraca zawsze 6 cyfr (także z zerami wiodącymi)', () => {
    for (let i = 0; i < 200; i++) expect(newOtp()).toMatch(/^\d{6}$/);
  });

  it('hashOtp jest deterministyczny i zależy od id umowy oraz kodu', () => {
    const a = hashOtp('id-1', '123456');
    expect(a).toBe(hashOtp('id-1', '123456'));
    expect(a).not.toBe(hashOtp('id-2', '123456'));
    expect(a).not.toBe(hashOtp('id-1', '123457'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('safeEqualHex', () => {
  it('porównuje skróty hex', () => {
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abce')).toBe(false);
    expect(safeEqualHex('abcd', 'abcdef')).toBe(false);
  });
});

describe('hashIp', () => {
  it('zwraca 32 znaki hex i nie ujawnia adresu', () => {
    const h = hashIp('203.0.113.7');
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).not.toContain('203');
    expect(h).toBe(hashIp('203.0.113.7'));
    expect(h).not.toBe(hashIp('203.0.113.8'));
  });
});

describe('ticket', () => {
  it('poprawny bilet jest odczytywany', () => {
    expect(readTicket(newTicket('abc', 'settlement', 60_000))).toEqual({
      id: 'abc',
      kind: 'settlement',
    });
  });

  it('bilet wygasa', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const ticket = newTicket('abc', 'k', 1000);
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));
    expect(readTicket(ticket)).toBeNull();
  });

  it('zmiana dowolnej części unieważnia podpis', () => {
    const [id, kind, exp, mac] = newTicket('abc', 'k', 60_000).split('.') as [
      string,
      string,
      string,
      string,
    ];
    expect(readTicket([id, 'inny', exp, mac].join('.'))).toBeNull();
    expect(readTicket(['inne', kind, exp, mac].join('.'))).toBeNull();
    expect(readTicket([id, kind, String(Number(exp) + 1_000_000), mac].join('.'))).toBeNull();
  });

  it.each([undefined, null, 5, '', 'a.b.c', 'a.b.c.d.e'])('odrzuca %j', (ticket) => {
    expect(readTicket(ticket)).toBeNull();
  });
});
