import type { ServerResponse } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendJson, type ApiRequest } from './http.js';
import { hasRole, isStaffDomainEmail, isStaffRole, type StaffRole } from '../../shared/roles.js';
import { isValidEmail } from '../../shared/validation.js';

export type SupabaseEnv = { url: string; anonKey: string; serviceKey: string };

export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return null;
  return { url, anonKey, serviceKey };
}

export function serviceClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Adres super administratora ze zmiennej środowiskowej SUPER_ADMIN_EMAIL (małe litery) albo null. */
export function superAdminEmail(): string | null {
  const value = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  return isValidEmail(value) ? value : null;
}

/**
 * Super administrator jest określany wyłącznie zmienną środowiskową. Tu synchronizujemy go z tabelą staff_roles,
 * z której korzystają polityki RLS: poprzedniemu (zmienionemu) super administratorowi obniżamy rolę do admin.
 */
async function syncSuperAdmin(db: SupabaseClient, email: string): Promise<void> {
  const demote = await db
    .from('staff_roles')
    .update({ role: 'admin' })
    .eq('role', 'super_admin')
    .neq('email', email);
  if (demote.error) throw demote.error;
  const upsert = await db
    .from('staff_roles')
    .upsert(
      { email, role: 'super_admin', granted_by: 'SUPER_ADMIN_EMAIL' },
      { onConflict: 'email' },
    );
  if (upsert.error) throw upsert.error;
}

export type Identity = { db: SupabaseClient; email: string; role: StaffRole | null };

/**
 * Ustala tożsamość zalogowanego użytkownika i jego rolę (null = konto bez uprawnień). Rolę rozstrzyga baza
 * (funkcja staff_role(), ta sama co w politykach RLS), a dla super administratora zmienna SUPER_ADMIN_EMAIL.
 * Przy niepowodzeniu sama wysyła odpowiedź i zwraca null.
 */
export async function identifyUser(
  req: ApiRequest,
  res: ServerResponse,
  who: string,
): Promise<Identity | null> {
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
  const email = userData?.user?.email?.toLowerCase();
  if (userError || !email) {
    sendJson(res, 401, { error: 'Sesja wygasła. Zaloguj się ponownie.' });
    return null;
  }

  const db = serviceClient(env);
  const superEmail = superAdminEmail();
  const isSuper = superEmail !== null && email === superEmail;

  if (!isSuper && !isStaffDomainEmail(email)) {
    sendJson(res, 403, { error: 'Logowanie jest dostępne tylko dla kont w domenie organizacji.' });
    return null;
  }

  if (isSuper) await syncSuperAdmin(db, email);

  const { data: dbRole, error: roleError } = await asUser.rpc('staff_role');
  if (roleError) throw roleError;
  const role: StaffRole | null = isSuper ? 'super_admin' : isStaffRole(dbRole) ? dbRole : null;

  // Kontrola klucza: service_role omija RLS, więc musi widzieć tabelę staff_roles (RLS włączone, brak
  // polityk; osoba z rolą jest w niej wpisana). Klucz anon / publishable zwraca tu 0 wierszy, a UPDATE po cichu
  // nie zmienia niczego.
  if (role) {
    const { data: probe, error: probeError } = await db
      .from('staff_roles')
      .select('email')
      .limit(1);
    if (probeError) throw probeError;
    if (!probe || probe.length === 0) {
      console.error(
        `${who}: SUPABASE_SERVICE_ROLE_KEY nie omija RLS (klucz anon/publishable lub z innego projektu).`,
      );
      sendJson(res, 500, {
        error:
          'SUPABASE_SERVICE_ROLE_KEY nie omija RLS. Wklej klucz service_role / Secret key z tego samego projektu (nie anon / publishable).',
      });
      return null;
    }
  }

  return { db, email, role };
}

export type StaffContext = { db: SupabaseClient; adminEmail: string; role: StaffRole };

/** Uwierzytelnia osobę z rolą co najmniej `min`. Przy niepowodzeniu sama wysyła odpowiedź i zwraca null. */
export async function authenticateStaff(
  req: ApiRequest,
  res: ServerResponse,
  who: string,
  min: StaffRole,
): Promise<StaffContext | null> {
  const identity = await identifyUser(req, res, who);
  if (!identity) return null;

  if (!hasRole(identity.role, min)) {
    sendJson(res, 403, {
      error: min === 'editor' ? 'Brak uprawnień do panelu.' : 'Brak uprawnień do tej operacji.',
    });
    return null;
  }
  return { db: identity.db, adminEmail: identity.email, role: identity.role as StaffRole };
}

/** Operacje administracyjne (umowy, rozliczenia): rola admin albo super_admin. */
export const authenticateAdmin = (req: ApiRequest, res: ServerResponse, who: string) =>
  authenticateStaff(req, res, who, 'admin');
