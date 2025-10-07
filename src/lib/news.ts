import { supabase } from './supabase';

export async function listNews() {
  const { data, error } = await supabase
    .from('posts')
    .select('id,slug,title,excerpt,cover_url,published_at')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNewsBySlug(slug: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .lte('published_at', new Date().toISOString())
    .single();
  if (error) throw error;
  return data;
}