import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyList } from './money';

// Intl wstawia twardą spację (U+00A0 / U+202F), więc normalizujemy białe znaki.
const norm = (s: string) => s.replaceAll(/\s/g, ' ');

describe('formatMoney', () => {
  it('przelicza grosze na złote', () => {
    expect(norm(formatMoney({ amount: 5000, currency: 'pln' }))).toBe('50,00 zł');
    expect(norm(formatMoney({ amount: 123456, currency: 'PLN' }))).toBe('1234,56 zł');
  });

  it('waluty bez części dziesiętnych nie są dzielone przez 100', () => {
    expect(formatMoney({ amount: 1000, currency: 'jpy' })).toContain('1000');
  });
});

describe('formatMoneyList', () => {
  it('pusta lista to 0,00 zł', () => {
    expect(norm(formatMoneyList([]))).toBe('0,00 zł');
  });

  it('łączy kwoty w różnych walutach', () => {
    const text = norm(
      formatMoneyList([
        { amount: 100, currency: 'pln' },
        { amount: 200, currency: 'eur' },
      ]),
    );
    expect(text).toContain(' + ');
    expect(text).toContain('1,00 zł');
  });
});
