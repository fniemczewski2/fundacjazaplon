import { supabase } from './supabase';
import { postJson } from './api';
import type { AssignableRole, StaffRole } from '../../shared/roles';

export type Me = { email: string; role: StaffRole | null };
export type StaffMember = { email: string; role: StaffRole; grantedBy: string | null; grantedAt: string };
export type PendingUser = { email: string; lastSignInAt: string | null };
export type StaffList = { staff: StaffMember[]; pending: PendingUser[] };

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  return token;
}

async function call<T>(body: Record<string, unknown>, fallbackError: string): Promise<T> {
  return postJson<T>('/api/staff', body, fallbackError, await accessToken());
}

/** Tożsamość i rola zalogowanej osoby (rola null = konto czeka na nadanie uprawnień). */
export const fetchMe = () => call<Me>({ action: 'me' }, 'Nie udało się sprawdzić uprawnień.');

export const listStaff = () => call<StaffList>({ action: 'list' }, 'Nie udało się wczytać listy uprawnień.');

export const setStaffRole = (email: string, role: AssignableRole) =>
  call<{ ok: true }>({ action: 'set', email, role }, 'Nie udało się zapisać uprawnień.');

export const removeStaffRole = (email: string) =>
  call<{ ok: true }>({ action: 'remove', email }, 'Nie udało się odebrać uprawnień.');
