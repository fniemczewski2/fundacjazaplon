import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptPii } from '../pii.js';
import { foundationFromContact, type AgreementRow, type Foundation } from './documents.js';

export const BUCKET = 'agreements';
export type AgreementStatus = 'submitted' | 'approved' | 'rejected' | 'signed' | 'completed';

export async function logEvent(
  db: SupabaseClient, agreementId: string, actor: string, event: string, details?: Record<string, unknown>,
) {
  const { error } = await db.from('agreement_events').insert({ agreement_id: agreementId, actor, event, details: details ?? null });
  // Brak wpisu audytowego nie może cofać operacji, która już się udała - tylko ślad w logach serwera.
  if (error) console.error('agreements: nie zapisano zdarzenia audytowego:', event, error.message);
}

export async function loadFoundation(db: SupabaseClient): Promise<Foundation> {
  const { data } = await db.from('contact_info').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  return foundationFromContact(data as Record<string, unknown> | null);
}

export async function uploadPdf(db: SupabaseClient, path: string, bytes: Uint8Array) {
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
}

export async function downloadPdf(db: SupabaseClient, path: string): Promise<Buffer> {
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) throw error ?? new Error('Nie znaleziono pliku.');
  return Buffer.from(await data.arrayBuffer());
}

export async function removeFile(db: SupabaseClient, path: string) {
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** Wiersz tabeli `agreements` w całości. Kolumna `pesel` jest po odczycie z bazy zaszyfrowana, patrz `withPlainPesel`. */
export type FullRow = AgreementRow & {
  status: AgreementStatus;
  guardian_email: string | null;
  rep_email: string | null;
  rep2_email: string | null;
  token_expires_at: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_sent_at: string | null;
  consents_saved_at: string | null;
  krk_file_path: string | null;
  krk_verified_at: string | null;
  rspts_verified_at: string | null;
  signed_file_path: string | null;
  content_sha256: string | null;
};

/** Zwraca kopię wiersza z odszyfrowanym numerem PESEL (do dokumentów PDF i podglądu administratora). */
export const withPlainPesel = (row: FullRow): FullRow => ({ ...row, pesel: decryptPii(row.pesel) });

/** Wiadomości (zaproszenie, kod, dokumenty) idą do osoby, która podpisuje: dla małoletniego to rodzic / opiekun prawny. */
export const recipientOf = (row: FullRow): string => (row.is_minor ? String(row.guardian_email) : row.email);
