import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { listPosts, type Post } from '../lib/post';
import Loader from '../components/Loader';

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const all = await listPosts();
        const published = all.filter((p) => p.published_at);
        setPosts(published);
      } catch (e: any) {
        setErr(e?.message ?? 'Błąd wczytywania wpisów.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Seo title="Aktualności | Fundacja Zapłon" />
      <h1 className="section-title">Aktualności</h1>

      {loading && <Loader />}

      {!loading && !err && (
        <>
          {posts.length === 0 ? (
            <p className="text-text-black/70 mt-6">Brak opublikowanych aktualności.</p>
          ) : (
            <ul className="p-4 mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="card overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition"
                >
                  <Link to={`/aktualnosci/${p.slug}`}>
                    {p.cover_url && (
                      <img
                        src={p.cover_url}
                        alt={p.title}
                        className="w-full h-48 object-cover aspect-video"
                      />
                    )}
                  </Link>

                  <div className="p-5 space-y-2">
                    <Link
                      to={`/aktualnosci/${p.slug}`}
                      className="text-xl font-semibold hover:underline block"
                    >
                      {p.title}
                    </Link>

                    <p className="text-sm opacity-70">
                      {p.published_at
                        ? new Date(p.published_at).toLocaleDateString('pl-PL')
                        : 'Szkic'}
                    </p>

                    {p.excerpt && (
                      <p className="text-text-black/70 text-sm line-clamp-3">
                        {p.excerpt}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
