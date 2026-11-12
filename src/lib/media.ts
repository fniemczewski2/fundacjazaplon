// src/lib/media.ts
import { supabase } from './supabase';
import { toSafeFileName } from './utils/text';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB, MEDIA_BUCKET } from './config';

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

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFromMedia(path: string): Promise<void> {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

export type MediaFile = { name: string; url: string };

export async function listMediaFiles(): Promise<MediaFile[]> {
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw error;
  // getPublicUrl tylko buduje adres (bez sieci), więc nie wymaga async.
  return (data ?? []).map((f) => ({ name: f.name, url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(f.name).data.publicUrl }));
}
