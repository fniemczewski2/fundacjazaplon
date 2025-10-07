// src/lib/admin.ts
import { supabase } from './supabase';

export type AdminCounts = {
  newsPublished: number;
  newsDrafts: number;
  teamCount: number;
  oNasUpdatedAt: string | null;
  kontaktUpdatedAt: string | null;
};

export async function getAdminCounts(): Promise<AdminCounts> {
  const nowIso = new Date().toISOString();

  const pubQ = supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .lte('published_at', nowIso);

  const draftQ = supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .is('published_at', null);

  const teamQ = supabase
    .from('team_members')
    .select('id', { count: 'exact', head: true });

  const oNasQ = supabase
    .from('single_pages')
    .select('updated_at')
    .eq('key', 'o-nas')
    .single();

  const kontaktQ = supabase
    .from('single_pages')
    .select('updated_at')
    .eq('key', 'kontakt')
    .single();

  const [pubRes, draftRes, teamRes, oNasRes, kontaktRes] = await Promise.all([
    pubQ,
    draftQ,
    teamQ,
    oNasQ,
    kontaktQ,
  ]);

  return {
    newsPublished: pubRes.count ?? 0,
    newsDrafts: draftRes.count ?? 0,
    teamCount: teamRes.count ?? 0,
    oNasUpdatedAt: (oNasRes.data?.updated_at as string | undefined) ?? null,
    kontaktUpdatedAt: (kontaktRes.data?.updated_at as string | undefined) ?? null,
  };
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.user?.email ?? null;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
  window.location.href = '/admin/login';
}
