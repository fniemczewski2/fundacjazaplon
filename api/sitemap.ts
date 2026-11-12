import type { ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { SITEMAP_PATHS, siteUrl } from './_lib/config.js';
import { supabaseEnv } from './_lib/auth.js';
import { escapeHtml } from './_lib/graph.js';
import type { ApiRequest } from './_lib/http.js';

const CACHE_SECONDS = 3600;

type PostRow = { slug: string; updated_at: string | null; published_at: string | null };

const urlEntry = (loc: string, lastmod?: string | null) =>
  `  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}\n  </url>`;

export default async function handler(_req: ApiRequest, res: ServerResponse) {
  const base = siteUrl();
  const entries = SITEMAP_PATHS.map((path) => urlEntry(`${base}${path === '/' ? '/' : path}`));

  const env = supabaseEnv();
  if (env) {
    const db = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db
      .from('posts')
      .select('slug, updated_at, published_at')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });
    if (error) console.error('sitemap:', error.message);
    for (const post of (data as PostRow[] | null) ?? []) {
      entries.push(urlEntry(`${base}/aktualnosci/${encodeURIComponent(post.slug)}`, post.updated_at ?? post.published_at));
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`);
  res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
}
