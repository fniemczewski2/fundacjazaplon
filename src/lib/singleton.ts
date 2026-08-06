import { supabase } from './supabase';

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
