// src/lib/settlementsAdmin.ts
import { supabase } from './supabase';

export type SettlementStatus = 'new' | 'accepted' | 'paid' | 'rejected';
export type DecisionAction = 'approve' | 'reject' | 'resend';

export type SettlementRow = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string | null;
  purpose: string;
  iban: string;
  amount_grosze: number;
  invoice_kind: 'pdf' | 'ksef';
  ksef_number: string | null;
  file_path: string | null;
  status: SettlementStatus;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
  notified_at: string | null;
  notify_error: string | null;
};

export type DecisionResult = { emailSent: boolean; emailError?: string };

export const formatPln = (grosze: number) =>
  (grosze / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

/** Dostęp ogranicza RLS (is_admin) - dla osoby spoza listy administratorów zwróci pustą listę. */
export async function listSettlements(): Promise<SettlementRow[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data as SettlementRow[]) ?? [];
}

/** Link do prywatnego PDF ważny 60 sekund. */
export async function getInvoiceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('settlements').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Nie udało się pobrać pliku.');
  return data.signedUrl;
}

/** Decyzja idzie przez serwer: zapis statusu + wysyłka e-mail do wnioskodawcy. */
export async function decideSettlement(
  id: string,
  action: DecisionAction,
  note?: string,
): Promise<DecisionResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');

  const response = await fetch('/api/decide-settlement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id, action, note }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data: { error?: string; emailSent?: boolean; emailError?: string } | null =
    contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) throw new Error(data?.error ?? `Serwer odpowiedział błędem (${response.status}).`);
  return { emailSent: data?.emailSent === true, emailError: data?.emailError };
}
