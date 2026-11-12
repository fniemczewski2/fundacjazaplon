// src/lib/documents.ts
import type { FileObject } from '@supabase/storage-js';
import { supabase } from './supabase';
import { toSafeFileName } from './utils/text';
import { ALLOWED_DOCUMENT_TYPES, DOCUMENTS_BUCKET, MAX_DOCUMENT_SIZE_MB } from './config';
import { logger } from './logger';

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

export type DocumentFile = {
  name: string;
  path: string;
  url: string;
  created_at: string | null;
  updated_at: string | null;
  size: number | undefined;
  metadata: FileObject['metadata'];
};

export async function listDocuments(prefix: DocCategory): Promise<DocumentFile[]> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error || !data) {
    if (error) logger.warn('listDocuments', error.message);
    return [];
  }

  return data.map((f: FileObject) => {
    const path = `${prefix}/${f.name}`;
    const { data: pub } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
    return {
      name: f.name,
      path,
      url: pub.publicUrl,
      created_at: f.created_at,
      updated_at: f.updated_at,
      size: typeof f.metadata?.size === 'number' ? f.metadata.size : undefined,
      metadata: f.metadata,
    };
  });
}

export class DocumentValidationError extends Error {}

function assertValidDocument(file: File) {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    throw new DocumentValidationError('Dozwolone są tylko pliki PDF, DOC, DOCX, ODT i TXT.');
  }
  if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
    throw new DocumentValidationError(`Plik jest za duży (maks. ${MAX_DOCUMENT_SIZE_MB}MB).`);
  }
}

export async function uploadDocument(prefix: DocCategory, file: File): Promise<string> {
  assertValidDocument(file);
  const safeName = toSafeFileName(file.name);
  const path = `${prefix}/${safeName}`;

  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function deleteDocument(path: string): Promise<void> {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
  if (error) throw error;
}
