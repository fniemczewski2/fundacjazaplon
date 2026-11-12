import { supabase } from './supabase';

export interface Material {
  id: string;
  title: string;
  description: string;
  format: string;
  cover_image: string;
  file_url: string;
  created_at?: string;
}

export async function listMaterials(): Promise<Material[]> {
  const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Material[]) ?? [];
}
