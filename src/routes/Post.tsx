import { useParams, Link } from 'wouter';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft } from 'react-icons/fa6';
import Seo from '../components/Seo';
import ArticleSchema from '../components/ArticleSchema';
import { SkeletonList } from '../components/Skeleton';
import { usePost } from '../hooks/useAppData';
import { SITE_URL } from '../lib/config';
import { getErrorMessage } from '../lib/utils/errors';

export default function Post() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isPending, error } = usePost(slug);

  if (isPending) {
    return (
      <div className="container-prose py-12 md:py-16">
        <SkeletonList variant="article" label="Wczytywanie wpisu" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container-prose py-20 text-center">
        <Seo title="Nie znaleziono wpisu | Fundacja „Zapłon”" noindex />
        <h1 className="section-title">Nie znaleźliśmy tego wpisu</h1>
        <p className="lead mt-4">
          {error ? getErrorMessage(error, 'Nie udało się wczytać wpisu.') : 'Adres mógł się zmienić albo wpis został usunięty.'}
        </p>
        <Link to="/aktualnosci" className="btn btn-primary mt-8">
          <FaArrowLeft aria-hidden="true" />
          Wróć do aktualności
        </Link>
      </div>
    );
  }

  const { title, excerpt, body_md, cover_url, published_at } = post;
  const url = `${SITE_URL}/aktualnosci/${post.slug}`;

  return (
    <>
      <Seo
        title={`${title} | Fundacja „Zapłon”`}
        description={excerpt ?? 'Aktualność Fundacji „Zapłon”.'}
        image={cover_url ?? undefined}
        type="article"
        breadcrumbs={[
          { name: 'Strona główna', path: '/' },
          { name: 'Aktualności', path: '/aktualnosci' },
          { name: title, path: `/aktualnosci/${post.slug}` },
        ]}
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
            alt={title}
            className="mt-8 aspect-video w-full rounded-2xl object-cover"
            loading="lazy"
          />
        )}

        <div className="prose mt-10 max-w-none">
          <ReactMarkdown>{body_md}</ReactMarkdown>
        </div>
      </article>
    </>
  );
}
