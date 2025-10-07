import { supabase } from './supabase';

export type JoinUs = {
  id: string;
  survey_url: string | null;
};

export async function getJoinLink(): Promise<JoinUs | null> {
  const { data, error } = await supabase
    .from('join_us')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[getJoinLink] error:', error);
    return null;
  }
  return data as JoinUs | null;
}

export async function upsertJoinLink(payload: Partial<JoinUs>) {
  const { error } = await supabase
    .from('join_us')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}
