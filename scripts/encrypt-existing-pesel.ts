// Jednorazowe zaszyfrowanie numerów PESEL zapisanych jawnie przed wdrożeniem szyfrowania.
//
//   AGREEMENTS_PII_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node --experimental-strip-types scripts/encrypt-existing-pesel.ts
//
// Skrypt jest idempotentny: wiersze już zaszyfrowane pomija.

import { createClient } from '@supabase/supabase-js';
import { encryptPii, isEncrypted } from '../api/_lib/pii.ts';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Ustaw SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.');

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await db.from('agreements').select('id, pesel');
if (error) throw error;

let updated = 0;
for (const row of data ?? []) {
  if (isEncrypted(String(row.pesel))) continue;
  const { error: updateError } = await db.from('agreements').update({ pesel: encryptPii(String(row.pesel)) }).eq('id', row.id);
  if (updateError) throw updateError;
  updated += 1;
}

process.stdout.write(`Zaszyfrowano wierszy: ${updated}\n`);
