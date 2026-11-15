import React, { useEffect, useState } from 'react';
import { Link, Redirect } from 'wouter';
import { supabase } from '../lib/supabase';
import { fetchMe } from '../lib/staff';
import { logger } from '../lib/logger';
import { hasRole, type StaffRole } from '../../shared/roles';
import Loader from '../components/Loader';
import Seo from '../components/Seo';
import AccessMessage from '../routes/admin/AccessMessage';
import { StaffContext, type StaffSession } from './staffContext';

type Props = { component: React.ComponentType; title: string; minRole?: StaffRole };

type Access =
  | { status: 'checking' }
  | { status: 'denied' }
  | { status: 'pending'; email: string }
  | { status: 'granted'; session: StaffSession };

/** Sprawdza sesję (logowanie przez Microsoft) i rolę nadaną w panelu. Rolę rozstrzyga serwer. */
async function resolveAccess(): Promise<Access> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { status: 'denied' };

  try {
    const me = await fetchMe();
    return me.role ? { status: 'granted', session: { email: me.email, role: me.role } } : { status: 'pending', email: me.email };
  } catch (error) {
    logger.warn('ProtectedAdminRoute', error instanceof Error ? error.message : error);
    return { status: 'denied' };
  }
}

export default function ProtectedAdminRoute({ component: Component, title, minRole = 'editor' }: Readonly<Props>) {
  const [access, setAccess] = useState<Access>({ status: 'checking' });

  useEffect(() => {
    let alive = true;
    const check = () =>
      resolveAccess()
        .then((result) => alive && setAccess(result))
        .catch(() => alive && setAccess({ status: 'denied' }));

    void check();
    // Wylogowanie w innej karcie albo wygaśnięcie sesji natychmiast zamyka dostęp do panelu.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setAccess({ status: 'denied' });
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (access.status === 'checking') return <Loader />;
  if (access.status === 'denied') return <Redirect to="/admin/login" />;
  if (access.status === 'pending') {
    return (
      <AccessMessage
        title="Konto czeka na uprawnienia"
        text={`Zalogowano jako ${access.email}. Poproś super administratora o nadanie roli, a następnie odśwież stronę.`}
      />
    );
  }

  if (!hasRole(access.session.role, minRole)) {
    return (
      <AccessMessage title="Brak uprawnień" text="Twoja rola nie obejmuje tej sekcji.">
        <Link to="/admin" className="btn btn-secondary">Wróć do panelu</Link>
      </AccessMessage>
    );
  }

  return (
    <StaffContext.Provider value={access.session}>
      <Seo title={`${title} | Panel Fundacji „Zapłon”`} noindex />
      <Component />
    </StaffContext.Provider>
  );
}
