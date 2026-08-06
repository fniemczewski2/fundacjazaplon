// src/lib/contact.ts
import { supabase } from './supabase';
import { getLatestSingleton } from './singleton';

export type ContactInfo = {
  id: string;
  address: string | null;
  krs: string | null;
  nip: string | null;
  regon: string | null;
  phone: string | null;
  email: string | null;
  account_number: string | null;
  online_address: string | null;
  updated_at: string;
};

export type ContactInfoInput = Partial<Omit<ContactInfo, 'id' | 'updated_at'>> & { id?: string };

export async function getContact(): Promise<ContactInfo | null> {
  return getLatestSingleton<ContactInfo>('contact_info');
}

export async function saveContact(payload: ContactInfoInput): Promise<void> {
  const row = {
    address: payload.address ?? null,
    krs: payload.krs ?? null,
    nip: payload.nip ?? null,
    regon: payload.regon ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    account_number: payload.account_number ?? null,
    online_address: payload.online_address ?? null,
  };

  const { error } = payload.id
    ? await supabase.from('contact_info').update(row).eq('id', payload.id)
    : await supabase.from('contact_info').insert([row]);

  if (error) throw error;
}
