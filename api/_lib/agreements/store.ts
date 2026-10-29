import type { SupabaseClient } from '@supabase/supabase-js';
import { foundationFromContact, type AgreementRow, type Foundation } from './documents.js';

export const BUCKET = 'agreements';
export const SITE_URL = () => (process.env.PUBLIC_SITE_URL || 'https://zaplon.org.pl').replace(/\/+$/, '');
export const DAY_MS = 86_400_000;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export type FullRow = AgreementRow & Record<string, any>;

/** Wiadomości (zaproszenie, kod, dokumenty) idą do osoby, która podpisuje: dla małoletniego to rodzic / opiekun prawny. */
export const recipientOf = (row: FullRow): string => (row.is_minor ? String(row.guardian_email) : row.email);
