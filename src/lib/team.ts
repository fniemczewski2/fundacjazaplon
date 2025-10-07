// src/lib/team.ts
import { supabase } from './supabase';

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  bio_md: string | null;
  order_index: number;
  active: boolean;
}

export type TeamMemberCreate = Omit<TeamMember, 'id'> & {
  photo_url?: string | null;
};

export type TeamMemberUpdate = Partial<Omit<TeamMember, 'id'>>;

export async function listTeamPublic(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('active', true)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TeamMember[]) ?? [];
}

export async function listTeam(opts?: { activeOnly?: boolean }): Promise<TeamMember[]> {
  let q = supabase.from('team_members').select('*').order('order_index', { ascending: true });
  if (opts?.activeOnly) q = q.eq('active', true);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as TeamMember[]) ?? [];
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return (data as TeamMember) ?? null;
}

export async function createTeamMember(payload: TeamMemberCreate): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert([payload])
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TeamMember;
}

export async function updateTeamMember(id: string, payload: TeamMemberUpdate): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TeamMember;
}


export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderTeamMembers(
  orders: Array<{ id: string; order_index: number }>
): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .upsert(orders, { onConflict: 'id' });

  if (error) throw new Error(error.message);
}
