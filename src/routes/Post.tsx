import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft } from 'react-icons/fa6';
import Seo from '../components/Seo';
import ArticleSchema from '../components/ArticleSchema';
import Loader from '../components/Loader';
import { getPostBySlug, type Post } from '../lib/post';
import { getErrorMessage } from '../lib/utils/errors';

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

        if (!data) setErr('Nie znaleźliśmy tego wpisu.');
        else setPost(data);
      } catch (e) {
        if (alive) setErr(getErrorMessage(e, 'Nie udało się wczytać wpisu.'));
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
      <div className="container-prose py-20 text-center">
        <h1 className="section-title">Nie znaleźliśmy tego wpisu</h1>
        <p className="lead mt-4">{err ?? 'Adres mógł się zmienić albo wpis został usunięty.'}</p>
        <Link to="/aktualnosci" className="btn btn-primary mt-8">
          <FaArrowLeft aria-hidden="true" />
          Wróć do aktualności
        </Link>
      </div>
    );
  }

  const { title, excerpt, body_md, cover_url, published_at } = post;
  const url = globalThis.window === undefined ? undefined : globalThis.location.href;

  return (
    <>
      <Seo
        title={`${title} | Fundacja „Zapłon”`}
        description={excerpt ?? 'Aktualność Fundacji „Zapłon”.'}
        image={cover_url ?? undefined}
      />

      <ArticleSchema
        title={title}
        description={excerpt ?? undefined}
        image={cover_url ?? undefined}
        datePublished={published_at ?? undefined}
        url={url}
      />

      <article className="container-prose py-12 md:py-16">
        <Link to="/aktualnosci" className="link-accent inline-flex items-center gap-2 text-sm">
          <FaArrowLeft aria-hidden="true" />
          Wszystkie aktualności
        </Link>

        <header className="mt-6">
          <h1 className="section-title">{title}</h1>

          {published_at && (
            <p className="muted mt-4 text-sm">
              Opublikowano{' '}
              <time dateTime={published_at}>
                {new Date(published_at).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </p>
          )}

          {excerpt && <p className="lead mt-5">{excerpt}</p>}
        </header>

        {cover_url && (
          <img
            src={`${cover_url}?width=1200&quality=80`}
            alt=""
            aria-hidden="true"
            className="mt-8 aspect-video w-full rounded-2xl object-cover"
            loading="lazy"
          />
        )}

        {/* Style Markdown pochodzą z klasy `.prose` zdefiniowanej w index.css.
            Wcześniej każdy element miał tu własny zestaw klas z twardo
            wpisanymi kolorami `text-gray-700`, które w ciemnym motywie
            spadały poniżej progu kontrastu. */}
        <div className="prose mt-10 max-w-none">
          <ReactMarkdown>{body_md}</ReactMarkdown>
        </div>
      </article>
    </>
  );
}
