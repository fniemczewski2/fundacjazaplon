// src/lib/settlements.ts
import { supabase } from './supabase';

export const MAX_INVOICE_SIZE_MB = 10;
export const MAX_AMOUNT_GROSZE = 100_000_000; // 1 000 000,00 zł - zgodnie z CHECK w bazie

/** Numer KSeF: NIP(10)-data(8)-12 znaków HEX-2 znaki HEX (35 znaków). */
export const KSEF_RE = /^\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2}$/;

export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export type InvoiceKind = 'pdf' | 'ksef';

export type SettlementInput = {
  firstName: string;
  lastName: string;
  email: string;
  purpose: string;
  iban: string;
  amount: string;
  kind: InvoiceKind;
  file: File | null;
  ksef: string;
};

export type FieldErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'purpose' | 'iban' | 'amount' | 'invoice', string>
>;

/** Usuwa spacje i myślniki; dokłada prefiks PL dla 26 cyfr. */
export function normalizeIban(value: string): string {
  const s = value.replaceAll(/[\s-]/g, '').toUpperCase();
  return /^\d{26}$/.test(s) ? `PL${s}` : s;
}

export function formatIban(value: string): string {
  const s = normalizeIban(value);
  return s.replaceAll(/(.{4})/g, '$1 ').trim();
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

export function validateSettlement(input: SettlementInput): FieldErrors {
  const errors: FieldErrors = {};

  const first = input.firstName.trim();
  const last = input.lastName.trim();
  const purpose = input.purpose.trim();

  if (!first) errors.firstName = 'Podaj imię.';
  else if (first.length > 100) errors.firstName = 'Imię może mieć maksymalnie 100 znaków.';

  if (!last) errors.lastName = 'Podaj nazwisko.';
  else if (last.length > 100) errors.lastName = 'Nazwisko może mieć maksymalnie 100 znaków.';

  const email = input.email.trim();
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Podaj poprawny adres e-mail.';

  if (purpose.length < 3) errors.purpose = 'Opisz cel wydatku (min. 3 znaki).';
  else if (purpose.length > 500) errors.purpose = 'Cel wydatku może mieć maksymalnie 500 znaków.';

  if (!isValidPlIban(normalizeIban(input.iban))) {
    errors.iban = 'Podaj poprawny polski numer konta (26 cyfr). Format lub suma kontrolna się nie zgadza.';
  }

  const grosze = parseAmountToGrosze(input.amount);
  if (grosze === null) errors.amount = 'Podaj kwotę w formacie 123,45 (maks. 2 miejsca po przecinku).';
  else if (grosze < 1) errors.amount = 'Kwota musi być większa od zera.';
  else if (grosze > MAX_AMOUNT_GROSZE) errors.amount = 'Kwota przekracza limit 1 000 000 zł.';

  if (input.kind === 'pdf') {
    if (!input.file) errors.invoice = 'Dołącz plik PDF z fakturą.';
    else if (input.file.size > MAX_INVOICE_SIZE_MB * 1024 * 1024) {
      errors.invoice = `Plik jest za duży (maks. ${MAX_INVOICE_SIZE_MB} MB).`;
    } else if (input.file.type !== 'application/pdf' && !/\.pdf$/i.test(input.file.name)) {
      errors.invoice = 'Dozwolony jest wyłącznie plik PDF.';
    }
  } else if (!KSEF_RE.test(input.ksef.trim().toUpperCase())) {
    errors.invoice = 'Numer KSeF ma format 1234567890-20260101-ABCDEF123456-AB (35 znaków).';
  }

  return errors;
}

/** Sprawdza nagłówek pliku - sam typ MIME z przeglądarki można podrobić. */
export async function looksLikePdf(file: File): Promise<boolean> {
  const head = await file.slice(0, 5).text();
  return head === '%PDF-';
}

export async function submitSettlement(input: SettlementInput): Promise<void> {
  const grosze = parseAmountToGrosze(input.amount);
  if (grosze === null) throw new Error('Nieprawidłowa kwota.');

  const id = crypto.randomUUID();
  let filePath: string | null = null;

  if (input.kind === 'pdf') {
    if (!input.file) throw new Error('Brak pliku faktury.');
    filePath = `${id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('settlements')
      .upload(filePath, input.file, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;
  }

  // Bez `.select()` - rola anon nie ma prawa odczytu, więc nie można żądać zwrotu wiersza.
  const { error } = await supabase.from('settlements').insert({
    id,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    purpose: input.purpose.trim(),
    iban: normalizeIban(input.iban),
    amount_grosze: grosze,
    invoice_kind: input.kind,
    ksef_number: input.kind === 'ksef' ? input.ksef.trim().toUpperCase() : null,
    file_path: filePath,
  });
  if (error) throw error;
}
