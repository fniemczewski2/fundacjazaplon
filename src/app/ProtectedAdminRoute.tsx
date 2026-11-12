import React, { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import Loader from '../components/Loader';
import Seo from '../components/Seo';

type Props = { component: React.ComponentType; title: string };

type Access = 'checking' | 'granted' | 'denied';

/** Sprawdza sesję i uprawnienia administratora (RPC `is_admin`, ta sama funkcja, której używają polityki RLS). */
async function resolveAccess(): Promise<Access> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 'denied';

  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error) {
    logger.warn('ProtectedAdminRoute', error.message);
    return 'denied';
  }
  return isAdmin === true ? 'granted' : 'denied';
}

export default function ProtectedAdminRoute({ component: Component, title }: Readonly<Props>) {
  const [access, setAccess] = useState<Access>('checking');

  useEffect(() => {
    let alive = true;
    const check = () =>
      resolveAccess()
        .then((result) => alive && setAccess(result))
        .catch(() => alive && setAccess('denied'));

    void check();
    // Wylogowanie w innej karcie albo wygaśnięcie sesji natychmiast zamyka dostęp do panelu.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setAccess('denied');
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (access === 'checking') return <Loader />;
  if (access === 'denied') return <Redirect to="/admin/login" />;

  return (
    <>
      <Seo title={`${title} | Panel Fundacji „Zapłon”`} noindex />
      <Component />
    </>
  );
}
