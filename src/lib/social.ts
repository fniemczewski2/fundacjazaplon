import { supabase } from './supabase';
import { getLatestSingleton } from './singleton';

export type SocialLinks = {
  id: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
};

export async function getSocialLinks(): Promise<SocialLinks | null> {
  return getLatestSingleton<SocialLinks>('social_links');
}

export async function upsertSocialLinks(payload: Partial<SocialLinks>): Promise<void> {
  const { error } = await supabase.from('social_links').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}
