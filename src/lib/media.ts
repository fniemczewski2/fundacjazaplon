// src/lib/media.ts
import { supabase } from './supabase';

export function sanitizeFileName(name: string) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
    .replace(/[’'"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

export async function uploadToMedia(folder: string, file: File): Promise<string> {
  const safeName = sanitizeFileName(file.name || `file-${Date.now()}`);
  const path = `${folder}/${safeName}`;

  const { error } = await supabase.storage.from('media').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (error) throw error;

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFromMedia(path: string) {
  const { error } = await supabase.storage.from('media').remove([path]);
  if (error) throw error;
}
