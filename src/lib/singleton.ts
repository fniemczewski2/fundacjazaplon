import { supabase } from './supabase';
import { logger } from './logger';

export async function getLatestSingleton<T>(table: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn(`getLatestSingleton:${table}`, error);
    return null;
  }
  return (data as T) ?? null;
}
