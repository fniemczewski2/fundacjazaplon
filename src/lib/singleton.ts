import { supabase } from './supabase';

/**
 * Pobiera "najnowszy" wiersz z tabeli traktowanej jako pojedynczy, edytowalny
 * rekord konfiguracyjny (np. dane kontaktowe, opis "o nas", linki social media).
 *
 * Wcześniej ten sam łańcuch `.select('*').order('updated_at').limit(1).maybeSingle()`
 * był powielony niezależnie w `contact.ts`, `join.ts`, `social.ts` i `about.ts`.
 *
 * Uwaga architektoniczna (patrz raport audytu, pkt 2.8): to nadal jest wzorzec
 * "najnowszy wpis udaje singleton", a nie prawdziwy singleton z ustaloną, znaną
 * z góry wartością `id`. Docelowo warto ujednolicić wszystkie te tabele do stałego
 * `id`, żeby równoległa edycja przez dwóch administratorów nie mogła po cichu
 * utworzyć konkurencyjnych wierszy zamiast nadpisać jeden wspólny rekord.
 */
export async function getLatestSingleton<T>(table: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[getLatestSingleton:${table}] error:`, error);
    return null;
  }
  return (data as T) ?? null;
}
