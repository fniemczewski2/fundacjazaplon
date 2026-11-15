import type { ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authenticateStaff, identifyUser, superAdminEmail } from './_lib/auth.js';
import { bodyOf, sendJson, type ApiRequest } from './_lib/http.js';
import { logSecurityEvent } from './_lib/securityEvents.js';
import { isAssignableRole, isStaffDomainEmail } from '../shared/roles.js';
import { isValidEmail } from '../shared/validation.js';

const ACTIONS = ['me', 'list', 'set', 'remove'] as const;
type Action = (typeof ACTIONS)[number];

const LIST_PAGES = 10;
const LIST_PER_PAGE = 200;

type StaffRow = { email: string; role: string; granted_by: string | null; granted_at: string };

/** Konta, które zalogowały się przez Microsoft, ale nie mają jeszcze roli (do nadania przez super administratora). */
async function pendingUsers(db: SupabaseClient, assigned: Set<string>) {
  const pending: Array<{ email: string; lastSignInAt: string | null }> = [];
  for (let page = 1; page <= LIST_PAGES; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: LIST_PER_PAGE });
    if (error) throw error;
    for (const user of data.users) {
      const email = user.email?.toLowerCase();
      if (email && isStaffDomainEmail(email) && !assigned.has(email)) {
        pending.push({ email, lastSignInAt: user.last_sign_in_at ?? null });
      }
    }
    if (data.users.length < LIST_PER_PAGE) break;
  }
  return pending.sort((a, b) => (b.lastSignInAt ?? '').localeCompare(a.lastSignInAt ?? ''));
}

function targetEmail(value: unknown): string | null {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return isValidEmail(email) && isStaffDomainEmail(email) ? email : null;
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const body = bodyOf(req);
  const action = body.action as Action;
  if (typeof body.action !== 'string' || !ACTIONS.includes(action)) {
    return sendJson(res, 400, { error: 'Nieprawidłowa akcja.' });
  }

  try {
    if (action === 'me') {
      const identity = await identifyUser(req, res, 'staff');
      if (!identity) return;
      return sendJson(res, 200, { email: identity.email, role: identity.role });
    }

    const auth = await authenticateStaff(req, res, 'staff', 'super_admin');
    if (!auth) return;
    const { db, adminEmail } = auth;
    const superEmail = superAdminEmail();

    if (action === 'list') {
      const { data, error } = await db
        .from('staff_roles')
        .select('email, role, granted_by, granted_at')
        .order('email');
      if (error) throw error;
      const rows = (data ?? []) as StaffRow[];
      const pending = await pendingUsers(db, new Set(rows.map((r) => r.email)));
      return sendJson(res, 200, {
        staff: rows.map((r) => ({
          email: r.email,
          role: r.role,
          grantedBy: r.granted_by,
          grantedAt: r.granted_at,
        })),
        pending,
      });
    }

    const email = targetEmail(body.email);
    if (!email) return sendJson(res, 400, { error: 'Podaj adres e-mail w domenie organizacji.' });
    if (email === superEmail)
      return sendJson(res, 409, { error: 'Roli super administratora nie można zmienić w panelu.' });

    if (action === 'set') {
      if (!isAssignableRole(body.role))
        return sendJson(res, 400, { error: 'Dozwolone role: administrator, redaktor.' });
      const { error } = await db
        .from('staff_roles')
        .upsert(
          { email, role: body.role, granted_by: adminEmail, granted_at: new Date().toISOString() },
          { onConflict: 'email' },
        );
      if (error) throw error;
      await logSecurityEvent(db, req, 'staff_role_set', {
        by: adminEmail,
        target: email,
        role: body.role,
      });
      return sendJson(res, 200, { ok: true });
    }

    const { error } = await db
      .from('staff_roles')
      .delete()
      .eq('email', email)
      .neq('role', 'super_admin');
    if (error) throw error;
    await logSecurityEvent(db, req, 'staff_role_removed', { by: adminEmail, target: email });
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('staff error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
