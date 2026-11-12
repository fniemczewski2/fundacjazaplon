// Walidacja współdzielona przez przeglądarkę (src/) i funkcje serwerowe (api/).
// Plik nie może importować niczego spoza `shared/`.

export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Numer KSeF: NIP(10)-data(8)-12 znaków HEX-2 znaki HEX (35 znaków). */
export const KSEF_RE = /^\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2}$/;

export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 100;
export const MAX_SETTLEMENT_PURPOSE = 500;
export const MIN_SETTLEMENT_PURPOSE = 3;
export const MAX_AMOUNT_GROSZE = 100_000_000; // 1 000 000,00 zł - zgodnie z CHECK w bazie
export const MAX_INVOICE_SIZE_MB = 10;

export const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);

/** Usuwa spacje i myślniki; dokłada prefiks PL dla 26 cyfr. */
export function normalizeIban(value: string): string {
  const s = value.replaceAll(/[\s-]/g, '').toUpperCase();
  return /^\d{26}$/.test(s) ? `PL${s}` : s;
}

export function formatIban(value: string): string {
  return normalizeIban(value)
    .replaceAll(/(.{4})/g, '$1 ')
    .trim();
}

/** Format PL + 26 cyfr oraz suma kontrolna mod 97 (ISO 13616). */
export function isValidPlIban(iban: string): boolean {
  if (!/^PL\d{26}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replaceAll(/[A-Z]/g, (c) => String((c.codePointAt(0) ?? 0) - 55));
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

/** "1 234,56" -> 123456 (grosze). Zwraca null dla błędnego formatu. Bez arytmetyki zmiennoprzecinkowej. */
export function parseAmountToGrosze(value: string): number | null {
  const s = value.replaceAll(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [zl, gr = ''] = s.split('.');
  return Number(zl) * 100 + Number(gr.padEnd(2, '0'));
}

export type InvoiceKind = 'pdf' | 'ksef';

export type SettlementFields = {
  firstName: string;
  lastName: string;
  email: string;
  purpose: string;
  iban: string;
  amount: string;
  kind: InvoiceKind;
  ksef: string;
};

export type SettlementFieldErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'purpose' | 'iban' | 'amount' | 'invoice', string>
>;

/** Walidacja pól rozliczenia (bez pliku). Ta sama funkcja działa w formularzu i w API. */
export function validateSettlementFields(input: SettlementFields): SettlementFieldErrors {
  const errors: SettlementFieldErrors = {};

  const first = input.firstName.trim();
  const last = input.lastName.trim();
  const purpose = input.purpose.trim();

  if (!first) errors.firstName = 'Podaj imię.';
  else if (first.length > MAX_NAME_LENGTH) errors.firstName = `Imię może mieć maksymalnie ${MAX_NAME_LENGTH} znaków.`;

  if (!last) errors.lastName = 'Podaj nazwisko.';
  else if (last.length > MAX_NAME_LENGTH) errors.lastName = `Nazwisko może mieć maksymalnie ${MAX_NAME_LENGTH} znaków.`;

  if (!isValidEmail(input.email.trim())) errors.email = 'Podaj poprawny adres e-mail.';

  if (purpose.length < MIN_SETTLEMENT_PURPOSE) {
    errors.purpose = `Opisz cel wydatku (min. ${MIN_SETTLEMENT_PURPOSE} znaki).`;
  } else if (purpose.length > MAX_SETTLEMENT_PURPOSE) {
    errors.purpose = `Cel wydatku może mieć maksymalnie ${MAX_SETTLEMENT_PURPOSE} znaków.`;
  }

  if (!isValidPlIban(normalizeIban(input.iban))) {
    errors.iban = 'Podaj poprawny polski numer konta (26 cyfr). Format lub suma kontrolna się nie zgadza.';
  }

  const grosze = parseAmountToGrosze(input.amount);
  if (grosze === null) errors.amount = 'Podaj kwotę w formacie 123,45 (maks. 2 miejsca po przecinku).';
  else if (grosze < 1) errors.amount = 'Kwota musi być większa od zera.';
  else if (grosze > MAX_AMOUNT_GROSZE) errors.amount = 'Kwota przekracza limit 1 000 000 zł.';

  if (input.kind === 'ksef' && !KSEF_RE.test(input.ksef.trim().toUpperCase())) {
    errors.invoice = 'Numer KSeF ma format 1234567890-20260101-ABCDEF123456-AB (35 znaków).';
  }

  return errors;
}
