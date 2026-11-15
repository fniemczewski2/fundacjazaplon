import type { InstagramConnectionStatus, InstagramPost } from '../../shared/instagram.js';
import { getRedis } from './redis.js';
import { shorten } from './http.js';
import { INSTAGRAM } from './config.js';

type GraphItem = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
  permalink?: string;
  timestamp?: string;
};

/** Wynik zapytania do Graph API; `error` nigdy nie zawiera tokenu. */
type GraphResult = { items: GraphItem[] | null; status: number | null; error: string | null };

/** Wartość zmiennej środowiskowej bez białych znaków i cudzysłowów wklejonych z pliku .env. */
function envValue(name: string): string | undefined {
  const raw = process.env[name]
    ?.trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim();
  return raw || undefined;
}

const config = () => ({
  token: envValue('INSTAGRAM_ACCESS_TOKEN'),
  id: envValue('INSTAGRAM_BUSINESS_ACCOUNT_ID'),
});

const mediaUrl = (id: string) =>
  `https://graph.facebook.com/${INSTAGRAM.graphVersion}/${encodeURIComponent(id)}/media` +
  `?fields=id,caption,media_url,thumbnail_url,permalink,timestamp,media_type&limit=${INSTAGRAM.fetchLimit}`;

async function fetchGraph(url: string, token: string): Promise<GraphResult> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(INSTAGRAM.timeoutMs),
    });
    const json = (await res.json().catch(() => null)) as {
      data?: unknown;
      error?: Record<string, unknown>;
    } | null;

    if (!res.ok) {
      // Graph API podaje przyczynę w polu error (np. wygasły token = kod 190, brak uprawnień = 10 lub 200).
      const e = json?.error;
      const error = e
        ? `kod ${String(e.code ?? '?')}${e.error_subcode ? `/${String(e.error_subcode)}` : ''}: ${String(e.message ?? '').slice(0, 300)}`
        : `status HTTP ${res.status}`;
      console.warn(`[instagram] Graph API zwróciło status ${res.status} (${error})`);
      return { items: null, status: res.status, error };
    }
    return {
      items: Array.isArray(json?.data) ? (json.data as GraphItem[]) : [],
      status: res.status,
      error: null,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.name : 'UnknownError';
    console.warn(`[instagram] pobranie postów nie powiodło się (${reason})`);
    return { items: null, status: null, error: `brak odpowiedzi (${reason})` };
  }
}

const isInstagramHost = (host: string) =>
  host === 'instagram.com' || host.endsWith('.instagram.com');
const isCdnHost = (host: string) =>
  host === 'cdninstagram.com' || host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net');

function safeUrl(value: string | undefined, allowed: (host: string) => boolean): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowed(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Graph API podaje czas w formacie z przesunięciem `+0000` (bez dwukropka), którego nie czytają wszystkie przeglądarki. */
function toIso(value: string | undefined): string {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return new Date(Number.isNaN(time) ? Date.now() : time).toISOString();
}

function mapItems(items: GraphItem[]): InstagramPost[] {
  const posts: InstagramPost[] = [];
  for (const item of items) {
    const permalink = safeUrl(item.permalink, isInstagramHost);
    if (!permalink) continue;
    // Dla VIDEO (w tym rolek) media_url wskazuje plik .mp4, więc używamy miniatury.
    const image = safeUrl(
      item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
      isCdnHost,
    );
    posts.push({
      id: item.id,
      caption: (item.caption ?? '').slice(0, INSTAGRAM.captionMax),
      image,
      permalink,
      date: toIso(item.timestamp),
    });
  }
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Pamięć podręczna w Redis jest tylko optymalizacją: jej awaria nie blokuje pobrania postów. */
async function cacheGet(key: string): Promise<InstagramPost[] | null> {
  try {
    const value = await getRedis().get<InstagramPost[]>(key);
    return Array.isArray(value) ? value : null;
  } catch (err) {
    console.warn('[instagram] odczyt cache:', shorten(err));
    return null;
  }
}

async function cacheSet(key: string, posts: InstagramPost[], ttlSec: number): Promise<void> {
  try {
    await getRedis().set(key, posts, { ex: ttlSec });
  } catch (err) {
    console.warn('[instagram] zapis cache:', shorten(err));
  }
}

/**
 * Ostatnie posty konta (świeże z cache, a przy błędzie Graph API ostatnia dobra kopia).
 * `configured = false`, gdy brak zmiennych środowiskowych: sekcja na stronie jest wtedy ukrywana.
 */
export async function getRecentInstagramPosts(): Promise<{
  configured: boolean;
  posts: InstagramPost[];
}> {
  const { token, id } = config();
  if (!token || !id) {
    if (!!token !== !!id)
      console.warn(
        '[instagram] ustawiono tylko jedną ze zmiennych INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID.',
      );
    return { configured: false, posts: [] };
  }

  const fresh = await cacheGet(INSTAGRAM.cacheKey);
  if (fresh) return { configured: true, posts: fresh.slice(0, INSTAGRAM.show) };

  const { items } = await fetchGraph(mediaUrl(id), token);
  if (items) {
    const posts = mapItems(items).slice(0, INSTAGRAM.show);
    await Promise.all([
      cacheSet(INSTAGRAM.cacheKey, posts, INSTAGRAM.cacheTtlSec),
      cacheSet(INSTAGRAM.staleKey, posts, INSTAGRAM.staleTtlSec),
    ]);
    return { configured: true, posts };
  }

  const stale = await cacheGet(INSTAGRAM.staleKey);
  return { configured: true, posts: stale ? stale.slice(0, INSTAGRAM.show) : [] };
}

/** Diagnostyka dla panelu: odpytuje Graph API na żywo (bez cache). */
export async function checkInstagramConnection(): Promise<InstagramConnectionStatus> {
  const { token, id } = config();
  const missing = [
    !token && 'INSTAGRAM_ACCESS_TOKEN',
    !id && 'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  ].filter((v): v is string => !!v);
  if (!token || !id)
    return { configured: false, missing, ok: false, status: null, error: null, postCount: null };

  const result = await fetchGraph(mediaUrl(id), token);
  return {
    configured: true,
    missing: [],
    ok: result.items !== null,
    status: result.status,
    error: result.error,
    postCount: result.items ? result.items.length : null,
  };
}
