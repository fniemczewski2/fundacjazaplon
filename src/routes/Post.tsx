import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Seo from '../components/Seo';
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

  if (loading) {
    return <Loader />;
  }

  if (err || !post) {
    return (
      <div className="container mx-auto p-6">
        <p className="mb-4">{err ?? 'Nie znaleziono wpisu.'}</p>
        <Link to="/aktualnosci" className="underline">
          ← Wróć do aktualności
        </Link>
      </div>
    );
  }

  const { title, excerpt, body_md, cover_url } = post;

  return (
    <>
      <Seo title={`${title} | Fundacja Zapłon`} description={excerpt ?? undefined} />
      <h1 className="section-title">{title}</h1>

      <article className="container mx-auto mt-6 p-4 grid w-full max-w-[1200px]">
        {cover_url && (
          <img
            src={cover_url}
            alt={title}
            className="w-full rounded-xl mb-6 object-cover aspect-video max-h-60"
          />
        )}

        <div className="prose max-w-none">
          <ReactMarkdown>{body_md}</ReactMarkdown>
        </div>

        <div className="mt-8">
          <Link to="/aktualnosci" className="hover:underline flex items-center text-sm text-brand">
            <FaArrowLeft />
            <span className="ml-2">Wszystkie aktualności</span>
          </Link>
        </div>
      </article>
    </>
  );
}
