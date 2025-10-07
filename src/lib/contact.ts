// src/lib/contact.ts
import { supabase } from './supabase';

export type ContactInfo = {
  id: string;
  address: string | null;
  krs: string | null;
  nip: string | null;
  regon: string | null;
  phone: string | null;
  email: string | null;
  account_number: string | null;
  updated_at: string;
};

// Pobierz najnowszy rekord kontaktu (albo null jeśli brak)
export async function getContact(): Promise<ContactInfo | null> {
  const { data, error } = await supabase
    .from('contact_info')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[getContact] error:', error);
    return null;
  }
  return data as ContactInfo | null;
}

// Zapis — jeśli jest id, update; jeśli nie, insert
export async function saveContact(payload: Partial<ContactInfo> & {
  id?: string;
  address?: string | null;
  krs?: string | null;
  nip?: string | null;
  regon?: string | null;
  phone?: string | null;
  email?: string | null;
  account_number?: string | null;
}) {
  if (payload.id) {
    const { error } = await supabase
      .from('contact_info')
      .update({
        address: payload.address ?? null,
        krs: payload.krs ?? null,
        nip: payload.nip ?? null,
        regon: payload.regon ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        account_number: payload.account_number ?? null,
      })
      .eq('id', payload.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('contact_info')
      .insert([{
        address: payload.address ?? null,
        krs: payload.krs ?? null,
        nip: payload.nip ?? null,
        regon: payload.regon ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        account_number: payload.account_number ?? null,
      }]);
    if (error) throw error;
  }
}
