import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Seo from '../components/Seo';
import ArticleSchema from '../components/ArticleSchema';
import { getPostBySlug, type Post } from '../lib/post';
import { FaArrowLeft } from 'react-icons/fa6';
import Loader from '../components/Loader';

export default function Post() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const data = await getPostBySlug(slug);
        if (!alive) return;

        if (!data) {
          setErr('Nie znaleziono wpisu.');
        } else {
          setPost(data);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Błąd wczytywania wpisu.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) return <Loader />;

  if (err || !post) {
    return (
      <div className="container mx-auto p-6">
        <p className="mb-4">{err ?? 'Nie znaleziono wpisu.'}</p>
        <Link to="/aktualnosci" className="underline flex items-center gap-2">
          <FaArrowLeft />
          Wróć do aktualności
        </Link>
      </div>
    );
  }

  const { title, excerpt, body_md, cover_url, published_at } = post;
  const url = typeof window !== 'undefined' ? window.location.href : undefined;

  return (
    <>
      <Seo
        title={`${title} | Fundacja „Zapłon”`}
        description={excerpt ?? 'Aktualność Fundacji Zapłon.'}
      />

      <ArticleSchema
        title={title}
        description={excerpt ?? undefined}
        image={cover_url ?? undefined}
        datePublished={published_at ?? undefined}
        url={url}
      />

      <article
        className="container mx-auto mt-6 p-4 w-full max-w-[1200px]"
        aria-labelledby="post-title"
      >
        <header className="mb-6">
          <h1 id="post-title" className="section-title">
            {title}
          </h1>

          {published_at && (
            <p className="text-sm text-text-black/60 mt-1">
              Opublikowano: {new Date(published_at).toLocaleDateString('pl-PL')}
            </p>
          )}
        </header>

        {cover_url && (
          <img
            src={cover_url}
            alt={`Okładka wpisu: ${title}`}
            className="w-full rounded-xl mb-6 object-cover aspect-video max-h-60"
            loading="lazy"
          />
        )}

        <div className="prose max-w-none">
          <ReactMarkdown>{body_md}</ReactMarkdown>
        </div>

        <footer className="mt-10">
          <Link
            to="/aktualnosci"
            className="hover:underline flex items-center text-sm text-brand"
          >
            <FaArrowLeft />
            <span className="ml-2">Wszystkie aktualności</span>
          </Link>
        </footer>
      </article>
    </>
  );
}
