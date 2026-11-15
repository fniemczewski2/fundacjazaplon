import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getErrorMessage } from '../../lib/utils/errors';
import { STAFF_DOMAIN } from '../../../shared/roles';
import AuthCard from './AuthCard';

export default function AdminLogin() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email',
          redirectTo: `${globalThis.location.origin}/admin`,
          queryParams: { domain_hint: STAFF_DOMAIN, prompt: 'select_account' },
        },
      });
      if (error) {
        setErr(error.message);
        setLoading(false);
      }
      // Powodzenie: przeglądarka przechodzi na stronę logowania Microsoft.
    } catch (error) {
      setErr(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Logowanie"
      heading="Logowanie do panelu"
      onSubmit={(e) => {
        e.preventDefault();
        void signIn();
      }}
    >
      <p className="text-sm text-ink-muted">
        Zaloguj się kontem Microsoft w domenie @{STAFF_DOMAIN}. Zakres dostępu zależy od roli
        nadanej przez super administratora.
      </p>
      {err && (
        <p className="field-error" role="alert">
          {err}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? 'Przekierowanie…' : 'Zaloguj przez Microsoft'}
      </button>
    </AuthCard>
  );
}
