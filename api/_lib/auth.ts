import type { ServerResponse } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendJson, type ApiRequest } from './http.js';

export type SupabaseEnv = { url: string; anonKey: string; serviceKey: string };

export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return null;
  return { url, anonKey, serviceKey };
}

export function serviceClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type AdminContext = { db: SupabaseClient; adminEmail: string };

/**
 * Uwierzytelnia administratora (token sesji + funkcja is_admin() użyta też przez RLS) i zwraca klienta
 * z kluczem service_role. Przy niepowodzeniu sama wysyła odpowiedź i zwraca null.
 */
export async function authenticateAdmin(req: ApiRequest, res: ServerResponse, who: string): Promise<AdminContext | null> {
  const env = supabaseEnv();
  if (!env) {
    console.error(`${who}: brak SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.`);
    sendJson(res, 500, { error: 'Błąd konfiguracji serwera.' });
    return null;
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    sendJson(res, 401, { error: 'Brak autoryzacji.' });
    return null;
  }

  const asUser = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await asUser.auth.getUser(token);
  const adminEmail = userData?.user?.email;
  if (userError || !adminEmail) {
    sendJson(res, 401, { error: 'Sesja wygasła. Zaloguj się ponownie.' });
    return null;
  }

  const { data: isAdmin, error: adminError } = await asUser.rpc('is_admin');
  if (adminError || isAdmin !== true) {
    sendJson(res, 403, { error: 'Brak uprawnień administratora.' });
    return null;
  }

  const db = serviceClient(env);

  // Kontrola klucza: service_role omija RLS, więc musi widzieć tabelę admin_emails (RLS włączone, brak
  // polityk; administrator, który właśnie przeszedł is_admin(), jest w niej wpisany). Klucz anon /
  // publishable zwraca tu 0 wierszy, a UPDATE po cichu nie zmienia niczego.
  const { data: probe, error: probeError } = await db.from('admin_emails').select('email').limit(1);
  if (probeError) throw probeError;
  if (!probe || probe.length === 0) {
    console.error(`${who}: SUPABASE_SERVICE_ROLE_KEY nie omija RLS (klucz anon/publishable lub z innego projektu).`);
    sendJson(res, 500, {
      error: 'SUPABASE_SERVICE_ROLE_KEY nie omija RLS. Wklej klucz service_role / Secret key z tego samego projektu (nie anon / publishable).',
    });
    return null;
  }

  return { db, adminEmail };
}
