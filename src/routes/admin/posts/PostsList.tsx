// src/routes/admin/posts/PostsList.tsx
import { Link } from 'wouter';
import { listPosts, type Post } from '../../../lib/post';
import Loader from '../../../components/Loader';
import { useAsyncData } from '../../../hooks/useAsyncData';

type PostStatus = 'draft' | 'scheduled' | 'published';

function getPostStatus(publishedAt: number | null, now: number): PostStatus {
  if (publishedAt === null) return 'draft';
  return publishedAt > now ? 'scheduled' : 'published';
}

export default function PostsList() {
  const { data: rows, loading, error: err, reload: refresh } = useAsyncData(listPosts, [] as Post[], 'Błąd pobierania danych.');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Aktualności</h1>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} className="px-3 py-2 rounded-xl border">Odśwież</button>
          <Link to="/admin/aktualnosci/new" className="btn btn-primary">
            Nowy wpis
          </Link>
        </div>
      </div>

      {renderPosts()}
    </div>
  );

  function renderPosts() {
    if (loading) return <Loader />;
    if (err) return <div className="text-sm text-danger">{err}</div>;
    if (rows.length === 0) return <div className="text-sm text-ink-muted">Brak wpisów.</div>;

    return (
        <ul className="space-y-2">
          {rows.map((r) => {
            const now = Date.now();
            const publishedAt = r.published_at ? new Date(r.published_at).getTime() : null;
            const status = getPostStatus(publishedAt, now);
            const statusLabel = { draft: 'szkic', scheduled: 'zaplanowany', published: 'opublikowany' }[status];
            const statusClass = {
              draft: 'bg-surface-cool text-ink-muted',
              scheduled: 'bg-warning/15 text-warning',
              published: 'bg-success/15 text-success',
            }[status];
            const updated = r.updated_at ? new Date(r.updated_at).toLocaleString() : '';
            return (
              <li key={r.id} className="p-3 border rounded-xl flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-sm text-ink-muted truncate">
                    <span className={`inline-flex items-center gap-2`}>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                        {statusLabel}
                      </span>
                      <span className="text-ink-muted">•</span>
                      <span>/aktualnosci/{r.slug}</span>
                      {updated && (
                        <>
                          <span className="text-ink-muted">•</span>
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
    );
  }
}
