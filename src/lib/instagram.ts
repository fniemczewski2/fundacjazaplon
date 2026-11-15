import { supabase } from './supabase';
import { postJson } from './api';
import type { InstagramConnectionStatus, InstagramPost } from '../../shared/instagram';

export type { InstagramConnectionStatus, InstagramPost };

/** Ostatnie posty. Błąd lub brak konfiguracji daje pustą listę: sekcja jest opcjonalna i wtedy się nie wyświetla. */
export async function getInstagramPosts(): Promise<InstagramPost[]> {
  try {
    const response = await fetch('/api/instagram-posts');
    if (!response.ok) return [];
    const data = (await response.json()) as { posts?: InstagramPost[] };
    return Array.isArray(data.posts) ? data.posts : [];
  } catch {
    return [];
  }
}

/** Diagnostyka połączenia z Graph API (panel). */
export async function checkInstagramConnection(): Promise<InstagramConnectionStatus> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  return postJson<InstagramConnectionStatus>('/api/instagram-posts', { action: 'check' }, 'Nie udało się sprawdzić połączenia.', token);
}
