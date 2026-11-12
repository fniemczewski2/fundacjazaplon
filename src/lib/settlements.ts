import { supabase } from './supabase';
import { postJson } from './api';
import { SETTLEMENT_BUCKET } from './config';
import {
  MAX_INVOICE_SIZE_MB,
  formatIban,
  validateSettlementFields,
  type InvoiceKind,
  type SettlementFieldErrors,
} from '../../shared/validation';

// Reguły walidacji (IBAN, kwota, KSeF, limity) żyją w shared/validation.ts: ten sam kod działa w formularzu i w API.
export { MAX_INVOICE_SIZE_MB, formatIban };
export type { InvoiceKind };
export type FieldErrors = SettlementFieldErrors;

export type SettlementInput = {
  firstName: string;
  lastName: string;
  email: string;
  purpose: string;
  iban: string;
  amount: string;
  kind: InvoiceKind;
  file: File | Blob | null;
  fileName?: string;
  ksef: string;
};

export function validateSettlement(input: SettlementInput): FieldErrors {
  const errors = validateSettlementFields(input);

  if (input.kind === 'pdf') {
    if (!input.file) errors.invoice = 'Dołącz plik PDF z fakturą.';
    else if (input.file.size > MAX_INVOICE_SIZE_MB * 1024 * 1024) {
      errors.invoice = `Plik jest za duży (maks. ${MAX_INVOICE_SIZE_MB} MB).`;
    } else if (input.file.type !== 'application/pdf' && !/\.pdf$/i.test(input.fileName ?? (input.file as File).name ?? '')) {
      errors.invoice = 'Dozwolony jest wyłącznie plik PDF.';
    }
  }

  return errors;
}

/** Sprawdza nagłówek pliku: sam typ MIME z przeglądarki można podrobić. */
export async function looksLikePdf(file: Blob): Promise<boolean> {
  return (await file.slice(0, 5).text()) === '%PDF-';
}

type PrepareResponse = { ticket: string; upload?: { path: string; token: string } };

const API = '/api/submit-settlement';

/**
 * Wysyłka rozliczenia w dwóch krokach przez serwer:
 * 1) prepare: weryfikacja captcha, bilet i jednorazowy adres wysyłki pliku,
 * 2) commit: walidacja po stronie serwera i zapis (plik trafia do magazynu bezpośrednio, z pominięciem limitu rozmiaru funkcji).
 */
export async function submitSettlement(input: SettlementInput, captchaToken: string | null): Promise<void> {
  const prepared = await postJson<PrepareResponse>(
    API,
    { action: 'prepare', kind: input.kind, captchaToken },
    'Nie udało się rozpocząć wysyłki. Spróbuj ponownie.',
  );

  if (input.kind === 'pdf') {
    if (!input.file || !prepared.upload) throw new Error('Brak pliku faktury.');
    const { error } = await supabase.storage
      .from(SETTLEMENT_BUCKET)
      .uploadToSignedUrl(prepared.upload.path, prepared.upload.token, input.file, { contentType: 'application/pdf' });
    if (error) throw error;
  }

  await postJson(
    API,
    {
      action: 'commit',
      ticket: prepared.ticket,
      kind: input.kind,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      purpose: input.purpose,
      iban: input.iban,
      amount: input.amount,
      ksef: input.ksef,
    },
    'Nie udało się wysłać rozliczenia. Spróbuj ponownie.',
  );
}

/** Błąd sieci (brak połączenia), w odróżnieniu od odpowiedzi serwera z kodem błędu. */
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return err instanceof Error && err.cause instanceof TypeError;
}
