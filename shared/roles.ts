// Role personelu panelu. Plik współdzielony przez przeglądarkę (src/) i funkcje serwerowe (api/).
// Plik nie może importować niczego spoza `shared/`.

/** Domena kont uprawnionych do logowania. Ta sama wartość jest zapisana w funkcjach SQL (migracja staff_roles). */
export const STAFF_DOMAIN = 'zaplon.org.pl';

export const STAFF_ROLES = ['editor', 'admin', 'super_admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Role, które super admin może nadawać (rola super_admin wynika wyłącznie ze zmiennej środowiskowej). */
export const ASSIGNABLE_ROLES = ['editor', 'admin'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  editor: 'Redaktor',
  admin: 'Administrator',
  super_admin: 'Super administrator',
};

const RANK: Record<StaffRole, number> = { editor: 1, admin: 2, super_admin: 3 };

export const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);

export const isAssignableRole = (value: unknown): value is AssignableRole =>
  typeof value === 'string' && (ASSIGNABLE_ROLES as readonly string[]).includes(value);

/** Czy rola `role` ma co najmniej uprawnienia roli `min`. */
export const hasRole = (role: StaffRole | null | undefined, min: StaffRole): boolean =>
  role !== null && role !== undefined && RANK[role] >= RANK[min];

export const isStaffDomainEmail = (email: string): boolean =>
  email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`);
