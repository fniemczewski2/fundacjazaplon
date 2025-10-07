// src/lib/post.ts
import { supabase } from './supabase';
import { uploadToMedia } from './media';

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

export async function listPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Post[]) ?? [];
}

export async function getPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
  if (error && error.code === 'PGRST116') return null;
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

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .single();
  // @ts-ignore
  if (error && error.code === 'PGRST116') return null;
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
  return input
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[’'"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
