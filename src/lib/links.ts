import { supabase } from './supabase';
import type { LinkIcon, LinkKind } from '../../shared/links';

export type LinkItem = {
  id: string;
  kind: LinkKind;
  title: string;
  description: string | null;
  url: string | null;
  icon: LinkIcon;
  active: boolean;
  sort_order: number;
};

export type LinkDraft = Pick<LinkItem, 'kind' | 'title' | 'description' | 'url' | 'icon' | 'active'>;

const COLUMNS = 'id, kind, title, description, url, icon, active, sort_order';

/** Pozycje do wyświetlenia. Publicznie RLS zwraca tylko aktywne, a osobom z panelu wszystkie. */
export async function listLinks(): Promise<LinkItem[]> {
  const { data, error } = await supabase.from('link_items').select(COLUMNS).order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as LinkItem[]) ?? [];
}

export async function createLink(draft: LinkDraft, sortOrder: number): Promise<void> {
  const { error } = await supabase.from('link_items').insert([{ ...draft, sort_order: sortOrder }]);
  if (error) throw new Error(error.message);
}

export async function updateLink(id: string, patch: Partial<LinkDraft>): Promise<void> {
  const { error } = await supabase.from('link_items').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from('link_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Zapisuje kolejność (osobne UPDATE, bo upsert częściowych wierszy łamie NOT NULL). */
export async function saveLinkOrder(ids: string[]): Promise<void> {
  const results = await Promise.all(ids.map((id, index) => supabase.from('link_items').update({ sort_order: index + 1 }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
