import { describe, expect, it } from 'vitest';
import {
  KSEF_RE,
  MAX_AMOUNT_GROSZE,
  formatIban,
  isValidEmail,
  isValidPlIban,
  normalizeIban,
  parseAmountToGrosze,
  validateSettlementFields,
  type SettlementFields,
} from './validation';

// Numer rachunku z prawidłową sumą kontrolną mod 97 (wartość testowa).
const VALID_IBAN = 'PL61109010140000071219812874';

const validFields = (): SettlementFields => ({
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan@example.com',
  purpose: 'Zakup materiałów na warsztaty',
  iban: VALID_IBAN,
  amount: '123,45',
  kind: 'pdf',
  ksef: '',
});

describe('isValidEmail', () => {
  it('akceptuje poprawne adresy', () => {
    expect(isValidEmail('a@b.pl')).toBe(true);
    expect(isValidEmail('jan.kowalski+test@sub.example.com')).toBe(true);
  });

  it.each(['', 'a@b', 'a b@c.pl', '@b.pl', 'a@.pl', 'a@b..pl', 42, null, undefined])(
    'odrzuca %j',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );

  it('odrzuca adres dłuższy niż 254 znaki', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@b.pl`)).toBe(false);
  });
});

describe('IBAN', () => {
  it('normalizeIban usuwa spacje i myślniki oraz dokłada PL dla 26 cyfr', () => {
    expect(normalizeIban('61 1090 1014 0000 0712 1981 2874')).toBe(VALID_IBAN);
    expect(normalizeIban('pl61-1090-1014-0000-0712-1981-2874')).toBe(VALID_IBAN);
  });

  it('formatIban grupuje po 4 znaki', () => {
    expect(formatIban(VALID_IBAN)).toBe('PL61 1090 1014 0000 0712 1981 2874');
  });

  it('isValidPlIban sprawdza format i sumę kontrolną', () => {
    expect(isValidPlIban(VALID_IBAN)).toBe(true);
    expect(isValidPlIban('PL62109010140000071219812874')).toBe(false); // zła suma kontrolna
    expect(isValidPlIban('PL6110901014000007121981287')).toBe(false); // za krótki
    expect(isValidPlIban('DE61109010140000071219812874')).toBe(false); // inny kraj
  });
});

describe('parseAmountToGrosze', () => {
  it.each([
    ['1 234,56', 123456],
    ['123,45', 12345],
    ['123.45', 12345],
    ['10', 1000],
    ['0,5', 50],
    ['0,05', 5],
  ])('%s -> %d', (input, expected) => {
    expect(parseAmountToGrosze(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,234', '-5', '1,2,3', '1e3'])('odrzuca %j', (input) => {
    expect(parseAmountToGrosze(input)).toBeNull();
  });
});

describe('KSEF_RE', () => {
  it('akceptuje numer 35-znakowy w formacie KSeF', () => {
    expect(KSEF_RE.test('1234567890-20260101-ABCDEF123456-AB')).toBe(true);
  });

  it('odrzuca małe litery i zły układ', () => {
    expect(KSEF_RE.test('1234567890-20260101-abcdef123456-ab')).toBe(false);
    expect(KSEF_RE.test('1234567890-2026010-ABCDEF123456-AB')).toBe(false);
  });
});

describe('validateSettlementFields', () => {
  it('poprawne dane nie dają błędów', () => {
    expect(validateSettlementFields(validFields())).toEqual({});
  });

  it('zgłasza puste imię, nazwisko i zły e-mail', () => {
    const errors = validateSettlementFields({
      ...validFields(),
      firstName: ' ',
      lastName: '',
      email: 'x',
    });
    expect(Object.keys(errors).sort()).toEqual(['email', 'firstName', 'lastName']);
  });

  it('wymaga celu o długości 3-500 znaków', () => {
    expect(validateSettlementFields({ ...validFields(), purpose: 'ab' }).purpose).toBeDefined();
    expect(
      validateSettlementFields({ ...validFields(), purpose: 'a'.repeat(501) }).purpose,
    ).toBeDefined();
    expect(
      validateSettlementFields({ ...validFields(), purpose: 'a'.repeat(500) }).purpose,
    ).toBeUndefined();
  });

  it('waliduje kwotę: format, zero i limit', () => {
    expect(validateSettlementFields({ ...validFields(), amount: 'abc' }).amount).toBeDefined();
    expect(validateSettlementFields({ ...validFields(), amount: '0' }).amount).toBeDefined();
    const limit = String(MAX_AMOUNT_GROSZE / 100);
    expect(validateSettlementFields({ ...validFields(), amount: limit }).amount).toBeUndefined();
    expect(
      validateSettlementFields({ ...validFields(), amount: `${limit},01` }).amount,
    ).toBeDefined();
  });

  it('wymaga poprawnego IBAN', () => {
    expect(
      validateSettlementFields({ ...validFields(), iban: 'PL00000000000000000000000000' }).iban,
    ).toBeDefined();
  });

  it('numer KSeF jest sprawdzany tylko dla rodzaju ksef', () => {
    expect(
      validateSettlementFields({ ...validFields(), kind: 'pdf', ksef: 'zły' }).invoice,
    ).toBeUndefined();
    expect(
      validateSettlementFields({ ...validFields(), kind: 'ksef', ksef: 'zły' }).invoice,
    ).toBeDefined();
    expect(
      validateSettlementFields({
        ...validFields(),
        kind: 'ksef',
        ksef: '1234567890-20260101-abcdef123456-ab',
      }).invoice,
    ).toBeUndefined();
  });
});
