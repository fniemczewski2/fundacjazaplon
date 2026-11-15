import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';
import { toSafeFileName, toSafeSlug } from './text';

describe('toSafeSlug', () => {
  it('usuwa polskie znaki, apostrofy i znaki specjalne', () => {
    expect(toSafeSlug('Zażółć gęślą jaźń')).toBe('zazolc-gesla-jazn');
    expect(toSafeSlug('Łódź')).toBe('lodz');
    expect(toSafeSlug("Rock'n'Roll – wielki finał!")).toBe('rocknroll-wielki-final');
  });

  it('zwija powtórzone myślniki i przycina krawędzie', () => {
    expect(toSafeSlug('  --a   b--  ')).toBe('a-b');
  });

  it('keepDots zachowuje kropki (nazwy plików)', () => {
    expect(toSafeSlug('Plik Końcowy.PDF', { keepDots: true })).toBe('plik-koncowy.pdf');
    expect(toSafeSlug('a.b')).toBe('a-b');
  });
});

describe('toSafeFileName', () => {
  it('nigdy nie zwraca pustej nazwy', () => {
    expect(toSafeFileName('???')).toMatch(/^plik-\d+$/);
  });

  it('nie dopuszcza ukośników (path traversal)', () => {
    expect(toSafeFileName('../../etc/passwd')).not.toContain('/');
  });
});

describe('getErrorMessage', () => {
  it('wyciąga komunikat z Error, tekstu lub zwraca wartość zastępczą', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('tekst')).toBe('tekst');
    expect(getErrorMessage(null)).toBe('Wystąpił nieoczekiwany błąd.');
    expect(getErrorMessage(new Error(''), 'x')).toBe('x');
  });
});
