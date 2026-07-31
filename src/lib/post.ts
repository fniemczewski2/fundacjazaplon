// src/lib/post.ts
import { supabase } from './supabase';
import { uploadToMedia } from './media';
import { toSafeSlug } from './utils/text';

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PostCreate = Omit<Post, 'id' | 'created_at' | 'updated_at'>;
export type PostUpdate = Partial<Omit<Post, 'id' | 'created_at' | 'updated_at'>>;

const NOT_FOUND_CODE = 'PGRST116';

/** Wszystkie wpisy (w tym szkice) — do użytku wyłącznie w panelu admina. */
export async function listPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Post[]) ?? [];
}

/**
 * Tylko realnie opublikowane wpisy (`published_at` w przeszłości) — do użytku
 * na stronach publicznych. W przeciwieństwie do samego filtrowania "czy pole
 * jest niepuste", to poprawnie ukrywa też wpisy zaplanowane na przyszłość.
 */
export async function listPublishedPosts(): Promise<Post[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Post[]) ?? [];
}

export async function getPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
  if (error && error.code === NOT_FOUND_CODE) return null;
  if (error) throw new Error(error.message);
  return (data as Post) ?? null;
}

export async function createPost(payload: PostCreate): Promise<Post> {
  const { data, error } = await supabase.from('posts').insert([payload]).select('*').single();
  if (error) throw new Error(error.message);
  return data as Post;
}

export async function updatePost(id: string, payload: PostUpdate): Promise<Post> {
  const { data, error } = await supabase.from('posts').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as Post;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Pojedynczy wpis po slugu, tylko jeśli już realnie opublikowany (patrz `listPublishedPosts`). */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .lte('published_at', nowIso)
    .single();

  if (error && error.code === NOT_FOUND_CODE) return null;
  if (error) throw new Error(error.message);
  return data as Post;
}

export async function uploadPostCover(postId: string, file: File): Promise<string> {
  const url = await uploadToMedia(`posts/${postId}`, file);
  // od razu zapisz cover_url w rekordzie
  await updatePost(postId, { cover_url: url });
  return url;
}

export function slugify(input: string): string {
  return toSafeSlug(input);
}
