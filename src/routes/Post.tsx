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
        description={excerpt ?? 'Aktualność Fundacji „Zapłon”.'}
      />

      <ArticleSchema
        title={title}
        description={excerpt ?? undefined}
        image={cover_url ?? undefined}
        datePublished={published_at ?? undefined}
        url={url}
      />

      <article
        className="container mx-auto p-4 w-full max-w-[1200px]"
        aria-labelledby="post-title"
      >
        <header className="mb-4">
          <h1 id="post-title" className="section-title">
            {title}
          </h1>
        </header>
        <div className='flex justify-between items-center mb-4'>

          <Link
            to="/aktualnosci"
            className="hover:underline dark:hover:decoration-accent-orange flex items-center text-sm text-brand"
          >
            <FaArrowLeft className='fill-brand dark:fill-accent-orange'/>
            <p className="ml-1 mt-0 text-brand dark:text-accent-orange w-fit">Wszystkie aktualności</p>
          </Link>
          {published_at && (
            <p className="text-sm text-text-black/60 mt-2">
              Opublikowano: {new Date(published_at).toLocaleDateString('pl-PL')}
            </p>
          )}
        </div>
        {cover_url && (
          <img
            src={cover_url}
            alt={`Okładka wpisu: ${title}`}
            className="w-full rounded-xl mb-6 object-contain aspect-video max-h-[400px]"
            loading="lazy"
          />
        )}

        <div className="prose max-w-none">
          <ReactMarkdown
          components={{
              // Duże nagłówki z wyraźnymi marginesami
              h2: ({ node, ...props }) => (
                <h2 className="text-3xl md:text-4xl font-bold mt-10 mb-5 text-text-black dark:text-white" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-2xl md:text-3xl font-semibold mt-8 mb-4 text-text-black dark:text-white" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-xl md:text-2xl font-medium mt-6 mb-3 text-text-black dark:text-white" {...props} />
              ),
              // Zwykły tekst (zwiększona czytelność, linia i dolny margines)
              p: ({ node, ...props }) => (
                <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-6" {...props} />
              ),
              // Listy punktowane i numerowane
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside text-lg text-gray-700 dark:text-gray-300 mb-6 space-y-2" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside text-lg text-gray-700 dark:text-gray-300 mb-6 space-y-2" {...props} />
              ),
              // Linki (wyróżnienie kolorem marki)
              a: ({ node, ...props }) => (
                <a className="text-brand dark:text-accent-orange hover:underline font-medium" {...props} />
              ),
            }}
          >
          
          {body_md}</ReactMarkdown>
        </div>
      </article>
    </>
  );
}
