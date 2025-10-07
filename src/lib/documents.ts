// src/lib/documents.ts
import { supabase } from './supabase';

export type DocCategory =
  | 'statut'
  | 'sprawozdania'
  | 'polityka-prywatnosci'
  | 'standardy-ochrony-maloletnich';

export const ALL_CATEGORIES = [
  { key: 'statut', label: 'Statut fundacji' },
  { key: 'sprawozdania', label: 'Sprawozdania finansowe' },
  { key: 'polityka-prywatnosci', label: 'Polityka prywatności' },
  { key: 'standardy-ochrony-maloletnich', label: 'Standardy ochrony małoletnich' },
] as const;

function sanitizeFileName(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/[’'"]/g, '') 
    .replace(/[–—]/g, '-') 
    .replace(/\s+/g, '-')  
    .toLowerCase();
  const cleaned = base.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
  return cleaned || `plik-${Date.now()}`;
}

export async function listDocuments(prefix: DocCategory) {
  const { data, error } = await supabase.storage.from('documents')
    .list(`${prefix}`, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) return [];
  return data.map((f) => {
    const path = `${prefix}/${f.name}`;
    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
    return {
      name: f.name,
      path,
      url: pub.publicUrl,
      created_at: (f as any).created_at,
      updated_at: (f as any).updated_at,
      size: (f as any).size,
      metadata: (f as any).metadata,
    };
  });
}

export async function uploadDocument(prefix: DocCategory, file: File) {
  const safeName = sanitizeFileName(file.name);
  const path = `${prefix}/${safeName}`;

  const { error } = await supabase.storage.from('documents').upload(
    path,
    file,
    {
      upsert: true,                         
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
    }
  );
  if (error) throw error;
  return path;
}

export async function deleteDocument(path: string) {
  const { error } = await supabase.storage.from('documents').remove([path]);
  if (error) throw error;
}
