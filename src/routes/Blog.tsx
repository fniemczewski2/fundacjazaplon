import { Link } from 'wouter';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Reveal from '../components/Reveal';
import { SkeletonList } from '../components/Skeleton';
import { usePublishedPosts } from '../hooks/useAppData';
import { getErrorMessage } from '../lib/utils/errors';

export default function Blog() {
  const { data: posts = [], isPending, error } = usePublishedPosts();
  const err = error ? getErrorMessage(error, 'Nie udało się wczytać wpisów.') : null;
  const loading = isPending;

  return (
    <>
      <Seo
        title="Aktualności | Fundacja „Zapłon”"
        description="Najnowsze aktualności, wydarzenia i projekty Fundacji „Zapłon”. Bądź na bieżąco z naszymi działaniami społecznymi."
        breadcrumbs={[
          { name: 'Strona główna', path: '/' },
          { name: 'Aktualności', path: '/aktualnosci' },
        ]}
      />

      <Page
        eyebrow="Co u nas"
        title="Aktualności"
        lead="Relacje z działań, zapowiedzi wydarzeń i to, co udało się dzięki wsparciu."
        illustration="megafon"
      >
        {loading && <SkeletonList count={6} label="Wczytywanie aktualności" />}

        {!loading && err && (
          <p role="alert" className="field-error">
            {err}
          </p>
        )}

        {!loading && !err && posts.length === 0 && (
          <p className="muted">Nie opublikowaliśmy jeszcze żadnych wpisów. Zajrzyj wkrótce.</p>
        )}

        {!loading && !err && posts.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal as="li" key={p.id} delay={(i % 3) * 110} className="h-full">
                <article className="card card-interactive flex h-full flex-col overflow-hidden p-0">
                  <div aria-hidden="true" className="aspect-[16/9] w-full overflow-hidden panel-cool">
                    {p.cover_url ? (
                      <img
                        src={`${p.cover_url}?width=560&height=315&resize=cover&quality=75`}
                        alt=""
                        width={560}
                        height={315}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="muted grid size-full place-items-center text-sm">
                        Brak zdjęcia
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-6">
                    <p className="muted text-xs tracking-wide uppercase">
                      {p.published_at
                        ? new Date(p.published_at).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Szkic'}
                    </p>

                    <h2 className="font-heading text-xl leading-snug font-semibold">
                      <Link
                        to={`/aktualnosci/${p.slug}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </h2>

                    {p.excerpt && (
                      <p className="muted line-clamp-3 text-sm leading-relaxed">{p.excerpt}</p>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        )}
      </Page>
    </>
  );
}
