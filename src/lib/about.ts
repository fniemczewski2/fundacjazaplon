// src/lib/about.ts
import { supabase } from './supabase';

export type AboutInfo = {
  id: string;
  description_md: string | null;
  updated_at: string;
};

export type Pillar = {
  id: string;
  order_index: number;
  title: string | null;
  body_md: string | null;
  updated_at: string;
};

export async function getAbout(): Promise<AboutInfo | null> {
  const { data, error } = await supabase
    .from('about_info')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.warn('[getAbout] error:', error); return null; }
  return (data as AboutInfo) ?? null;
}

export async function getPillars(): Promise<Pillar[]> {
  const { data, error } = await supabase
    .from('about_pillars')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) { console.warn('[getPillars] error:', error); return []; }
  return (data as Pillar[]) ?? [];
}

/** Upsert opisu; zwraca rekord z id */
export async function upsertAbout(description_md: string, id?: string) {
  const row = { id, description_md: description_md ?? null };
  const { data, error } = await supabase
    .from('about_info')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as AboutInfo;
}

/** Zapis pojedynczego filaru */
export async function savePillar(p: { id?: string; order_index: number; title: string | null; body_md: string | null }) {
  const row = {
    id: p.id ?? undefined,
    order_index: p.order_index,
    title: p.title ?? null,
    body_md: p.body_md ?? null,
  };
  const { data, error } = await supabase
    .from('about_pillars')
    .upsert(row, { onConflict: 'order_index' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Pillar;
}

/** Batch save – wygodne dla formularza 5 filarów */
export async function savePillarsBatch(pillars: Array<{ id?: string; order_index: number; title: string | null; body_md: string | null }>) {
  const rows = pillars.map(p => ({
    id: p.id ?? undefined,
    order_index: p.order_index,
    title: p.title ?? null,
    body_md: p.body_md ?? null,
  }));
  const { error } = await supabase
    .from('about_pillars')
    .upsert(rows, { onConflict: 'order_index' });
  if (error) throw error;
}
