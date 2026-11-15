import { createContext, useContext } from 'react';
import { hasRole, type StaffRole } from '../../shared/roles';

export type StaffSession = { email: string; role: StaffRole };

export const StaffContext = createContext<StaffSession | null>(null);

/** Zalogowana osoba z rolą. Hook działa wyłącznie wewnątrz tras chronionych przez `ProtectedAdminRoute`. */
export function useStaff(): StaffSession & { can: (min: StaffRole) => boolean } {
  const session = useContext(StaffContext);
  if (!session) throw new Error('useStaff wymaga ProtectedAdminRoute.');
  return { ...session, can: (min) => hasRole(session.role, min) };
}
