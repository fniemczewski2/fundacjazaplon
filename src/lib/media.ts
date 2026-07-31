// src/lib/media.ts
import { supabase } from './supabase';
import { toSafeFileName } from './utils/text';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_SIZE_MB = 8;

export class MediaValidationError extends Error {}

function assertValidImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new MediaValidationError('Dozwolone są tylko pliki JPG, PNG, WEBP i GIF.');
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new MediaValidationError(`Plik jest za duży (maks. ${MAX_IMAGE_SIZE_MB}MB).`);
  }
}

export async function uploadToMedia(folder: string, file: File): Promise<string> {
  assertValidImage(file);

  const safeName = toSafeFileName(file.name || `file-${Date.now()}`);
  const path = folder ? `${folder}/${safeName}` : safeName;

  const { error } = await supabase.storage.from('media').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (error) throw error;

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFromMedia(path: string): Promise<void> {
  const { error } = await supabase.storage.from('media').remove([path]);
  if (error) throw error;
}
