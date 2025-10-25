import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        return;
      }
      navigate('/admin', { replace: true });
    } catch (error) {
      setErr((error as Error)?.message ?? 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setForgotMsg(null);
    setErr(null);
    setForgotLoading(true);

    try {
      if (!forgotEmail) {
        setForgotMsg('Podaj email');
        return;
      }

      const redirectTo = `${window.location.origin}/reset-password`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo,
      });

      if (error) {
        setForgotMsg(error.message ?? 'Wystąpił błąd.');
        return;
      }

      setForgotMsg('Jeżeli konto istnieje, email został wysłany.');
    } catch (error) {
      setForgotMsg((error as Error)?.message ?? 'Wystąpił błąd.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <form onSubmit={forgotMode ? sendResetEmail : onSubmit} className="w-full max-w-sm space-y-4 bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-semibold">{forgotMode ? 'Reset password' : 'Admin Login'}</h1>

        {forgotMode ? (
          <>
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                className="w-full border p-2 rounded"
                placeholder="Email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </label>

            {forgotMsg && (
              <p className="text-sm text-gray-700" role="status" aria-live="polite">{forgotMsg}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-2xl bg-black text-white disabled:opacity-50"
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending…' : 'Send reset email'}
              </button>

              <button
                type="button"
                className="py-2 px-4 rounded-2xl border"
                onClick={() => {
                  setForgotMode(false);
                  setForgotMsg(null);
                }}
              >
                Powrót
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                className="w-full border p-2 rounded"
                placeholder="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="sr-only">Hasło</span>
              <input
                className="w-full border p-2 rounded"
                placeholder="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {err && (
              <p className="text-red-600 text-sm" role="alert" aria-live="assertive">
                {err}
              </p>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="py-2 rounded-2xl bg-black text-white disabled:opacity-50 w-2/3"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <button
                type="button"
                className="text-sm underline ml-2"
                onClick={() => {
                  setForgotMode(true);
                  setForgotEmail(email || '');
                }}
              >
                Zapomniał_ś hasła?
              </button>
            </div>
          </>
        )}
      </form>

      <div className="sr-only" aria-live="polite" />
    </div>
  );
}
