// src/routes/admin/posts/PostsList.tsx
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { listPosts, type Post } from '../../../lib/post';
import { getErrorMessage } from '../../../lib/utils/errors';
import Loader from '../../../components/Loader';

export default function PostsList() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await listPosts();
      setRows(data);
    } catch (e) {
      setErr(getErrorMessage(e, 'Błąd pobierania danych.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Aktualności</h1>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-2 rounded-xl border">Odśwież</button>
          <Link to="/admin/aktualnosci/new" className="px-3 py-2 rounded-xl bg-black text-white">
            Nowy wpis
          </Link>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : err ? (
        <div className="text-sm text-brand dark:text-accent-orange">{err}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-text-black/70">Brak wpisów.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const now = Date.now();
            const publishedAt = r.published_at ? new Date(r.published_at).getTime() : null;
            const status: 'draft' | 'scheduled' | 'published' =
              publishedAt === null ? 'draft' : publishedAt > now ? 'scheduled' : 'published';
            const statusLabel = { draft: 'szkic', scheduled: 'zaplanowany', published: 'opublikowany' }[status];
            const statusClass = {
              draft: 'bg-base-100 text-text-black/70',
              scheduled: 'bg-amber-100 text-amber-700',
              published: 'bg-green-100 text-green-600',
            }[status];
            const updated = r.updated_at ? new Date(r.updated_at).toLocaleString() : '';
            return (
              <li key={r.id} className="p-3 border rounded-xl flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-sm text-text-black/70 truncate">
                    <span className={`inline-flex items-center gap-2`}>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                        {statusLabel}
                      </span>
                      <span className="text-text-black/70">•</span>
                      <span>/aktualnosci/{r.slug}</span>
                      {updated && (
                        <>
                          <span className="text-text-black/70">•</span>
                          <span>zmieniono: {updated}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {status === 'published' && (
                    <a
                      href={`/aktualnosci/${r.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl border"
                      title="Podgląd na stronie"
                    >
                      Podgląd
                    </a>
                  )}
                  <Link to={`/admin/aktualnosci/${r.id}`} className="px-3 py-2 rounded-xl border">
                    Edytuj
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
