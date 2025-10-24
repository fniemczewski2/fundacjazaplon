import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Signed in successfully — navigate to your admin route.
      // Make sure you have a route like <Route path="/admin" element={<AdminDashboard/>} />
      navigate('/admin', { replace: true });
    } catch (error) {
      setErr((error as Error)?.message ?? 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-semibold">Admin Login</h1>

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
          <span className="sr-only">Password</span>
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

        <button
          type="submit"
          className="w-full py-2 rounded-2xl bg-black text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
