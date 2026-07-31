import { supabase } from './supabase';
import { getLatestSingleton } from './singleton';

export type JoinUs = {
  id: string;
  survey_url: string | null;
};

export async function getJoinLink(): Promise<JoinUs | null> {
  return getLatestSingleton<JoinUs>('join_us');
}

export async function upsertJoinLink(payload: Partial<JoinUs>): Promise<void> {
  const { error } = await supabase.from('join_us').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}
