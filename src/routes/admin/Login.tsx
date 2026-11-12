import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabase';
import { getErrorMessage } from '../../lib/utils/errors';
import Field from '../../components/ui/Field';
import AuthCard from './AuthCard';

const INVALID_CREDENTIALS = 'Nieprawidłowy adres e-mail lub hasło.';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const signIn = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.status === 400 ? INVALID_CREDENTIALS : error.message);
        return;
      }
      setLocation('/admin');
    } catch (error) {
      setErr(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async () => {
    setForgotMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${globalThis.location.origin}/reset-password`,
      });
      // Ta sama odpowiedź niezależnie od istnienia konta: nie ujawniamy, które adresy są zarejestrowane.
      if (error) setForgotMsg({ text: error.message, isError: true });
      else setForgotMsg({ text: 'Jeżeli konto istnieje, wysłaliśmy wiadomość z linkiem do zmiany hasła.', isError: false });
    } catch (error) {
      setForgotMsg({ text: getErrorMessage(error, 'Wystąpił błąd.'), isError: true });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void (forgotMode ? sendResetEmail() : signIn());
  };

  return (
    <AuthCard
      title={forgotMode ? 'Reset hasła' : 'Logowanie'}
      heading={forgotMode ? 'Reset hasła' : 'Logowanie do panelu'}
      onSubmit={onSubmit}
    >
      <Field label="Adres e-mail">
        {(a11y) => (
          <input
            {...a11y}
            className="input-plain w-full"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}
      </Field>

      {forgotMode ? (
        <>
          {forgotMsg && (
            <p className={forgotMsg.isError ? 'field-error' : 'text-sm text-ink'} role={forgotMsg.isError ? 'alert' : 'status'}>
              {forgotMsg.text}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'Wysyłanie…' : 'Wyślij link'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
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
          <Field label="Hasło" error={err ?? undefined}>
            {(a11y) => (
              <input
                {...a11y}
                className="input-plain w-full"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </Field>

          <div className="flex items-center justify-between gap-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logowanie…' : 'Zaloguj'}
            </button>
            <button
              type="button"
              className="link-quiet text-sm underline"
              onClick={() => {
                setForgotMode(true);
                setErr(null);
              }}
            >
              Nie pamiętasz hasła?
            </button>
          </div>
        </>
      )}
    </AuthCard>
  );
}
