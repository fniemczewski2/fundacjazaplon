import { supabase } from './supabase';

export type SocialLinks = {
  id: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
};

export async function getSocialLinks(): Promise<SocialLinks | null> {
  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[getSocialLinks] error:', error);
    return null;
  }
  return data as SocialLinks | null;
}

export async function upsertSocialLinks(payload: Partial<SocialLinks>) {
  const { error } = await supabase
    .from('social_links')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}
