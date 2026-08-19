import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from 'wouter';
import { getErrorMessage } from '../../lib/utils/errors';

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readyToUpdate, setReadyToUpdate] = useState(false);

  useEffect(() => {
    setMessage(null);
    setError(null);

    async function handlePossibleCode() {
      try {
        const url = new URL(globalThis.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          // Exchange the code for a session (PKCE flow)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('exchangeCodeForSession error', error);
            // don't return here - we still try to listen for onAuthStateChange below
          } else {
            // If exchange succeeded, we should have a valid session and can allow update
            setReadyToUpdate(true);
            setMessage('Wprowadź nowe hasło');
            return;
          }
        }

        // If no code or exchange failed, check current session
        const session = await supabase.auth.getSession();
        if (session?.data?.session) {
          // If a session exists (Supabase may create one automatically when clicking the reset link), allow update
          setReadyToUpdate(true);
          setMessage('Wprowadź nowe hasło');
        }
      } catch (err) {
        console.error(err);
      }
    }

    handlePossibleCode();

    // Listen for PASSWORD_RECOVERY event (emitted when the user clicks the reset link)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReadyToUpdate(true);
        setMessage('Wprowadź nowe hasło');
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!readyToUpdate) {
      setError('Coś poszło nie tak. Upewnij się, że link jest prawidłowy.');
      return;
    }

    if (newPassword.length < 10) {
      setError('Hasło powinno mieć min. 10 znaków.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
        return;
      }

      setMessage('Hasło zostało zaktualizowane. Przekierowanie do logowania...');
      setTimeout(() => setLocation('/admin/login'), 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-semibold">Reset hasła</h1>

        {message && <output className="block text-sm text-gray-700">{message}</output>}
        {error && <p className="text-sm text-brand dark:text-accent-orange" role="alert">{error}</p>}

        <label className="block">
          <span className="sr-only">Nowe hasło</span>
          <input
            className="w-full border p-2 rounded"
            placeholder="Nowe hasło"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <button
          type="submit"
          className="w-full py-2 rounded-2xl bg-black text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Ładowanie…' : 'Ustaw'}
        </button>
      </form>
    </div>
  );
}