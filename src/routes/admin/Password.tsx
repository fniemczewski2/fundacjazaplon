import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { MIN_PASSWORD_LENGTH } from '../../lib/config';
import { getErrorMessage } from '../../lib/utils/errors';
import Field from '../../components/ui/Field';
import AuthCard from './AuthCard';

const REDIRECT_DELAY_MS = 1200;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readyToUpdate, setReadyToUpdate] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const allowUpdate = () => {
      setReadyToUpdate(true);
      setMessage('Wprowadź nowe hasło.');
    };

    (async () => {
      try {
        const code = new URL(globalThis.location.href).searchParams.get('code');
        if (code) {
          // Przepływ PKCE: kod z linku zamieniamy na sesję.
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError) return allowUpdate();
          logger.warn('reset-password', 'exchangeCodeForSession', exchangeError.message);
        }

        // Bez kodu (albo przy błędzie wymiany) sprawdzamy, czy Supabase nie utworzył już sesji z linku.
        const { data } = await supabase.auth.getSession();
        if (data.session) allowUpdate();
      } catch (err) {
        logger.error('reset-password', err);
      }
    })();

    // Zdarzenie PASSWORD_RECOVERY pojawia się po kliknięciu linku z wiadomości.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') allowUpdate();
    });

    return () => {
      listener.subscription.unsubscribe();
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!readyToUpdate) {
      setError('Link jest nieprawidłowy albo wygasł. Poproś o nowy na stronie logowania.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Hasło powinno mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setMessage('Hasło zostało zmienione. Przekierowanie do logowania…');
      redirectTimer.current = setTimeout(() => setLocation('/admin/login'), REDIRECT_DELAY_MS);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Reset hasła" heading="Ustaw nowe hasło" onSubmit={onSubmit}>
      {message && <output className="block text-sm text-ink">{message}</output>}

      <Field label="Nowe hasło" hint={`Minimum ${MIN_PASSWORD_LENGTH} znaków.`} error={error ?? undefined}>
        {(a11y) => (
          <input
            {...a11y}
            className="input-plain w-full"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        )}
      </Field>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? 'Zapisywanie…' : 'Ustaw hasło'}
      </button>
    </AuthCard>
  );
}
