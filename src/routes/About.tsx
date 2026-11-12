import ReactMarkdown from 'react-markdown';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Card from '../components/Card';
import Reveal from '../components/Reveal';
import { Skeleton } from '../components/Skeleton';
import { useAbout } from '../hooks/useAppData';

/** Rozpoznaje zapis „(wkrótce)” używany w `about_pillars.body_md`. */
function isComingSoon(body: string | null): boolean {
  return body?.trim().toLowerCase().replace(/[()]/g, '') === 'wkrótce';
}

export default function About() {
  const { data, isPending: loading } = useAbout();
  const about = data?.about ?? null;
  const pillars = data?.pillars ?? [];

  const descriptionBlocks = about?.description_md
    ? about.description_md
        .split(/^[ \t]*---[ \t]*$/m)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  return (
    <>
      <Seo
        title="O nas | Fundacja „Zapłon”"
        description="Poznaj misję, wartości i działania Fundacji „Zapłon”. Wspieramy aktywność społeczną, budujemy kapitał społeczny i wzmacniamy organizacje pozarządowe."
      />

      <Page
        eyebrow="Fundacja Zapłon"
        title="O nas"
        lead="Skąd się wzięliśmy, dla kogo działamy i na czym opiera się nasza praca."
        illustration="ognisko"
      >
        {loading && (
          <output className="mx-auto block max-w-3xl space-y-3" aria-label="Wczytywanie treści">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </output>
        )}

        {!loading && descriptionBlocks.length > 0 && (
          <Reveal>
            <Card className="mx-auto max-w-3xl">
              {descriptionBlocks.map((block) => (
                <div key={block.slice(0, 60)} className="prose max-w-none">
                  <ReactMarkdown>{block}</ReactMarkdown>
                </div>
              ))}
            </Card>
          </Reveal>
        )}

        {!loading && pillars.length > 0 && (
          <section aria-labelledby="pillars-title" className="section-gap">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow mb-4 justify-center">Jak pomagamy</p>
              <h2 id="pillars-title" className="section-title">
                Filary naszej działalności
              </h2>
            </Reveal>

            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {pillars.map((p, i) => (
                <Reveal
                  as="li"
                  key={p.id || `pillar-${p.order_index}`}
                  delay={i * 90}
                  className="h-full"
                >
                  <article className="card flex h-full flex-col items-center p-6 text-center">
                    {p.image_url && (
                      <div className="mb-5 grid size-20 place-items-center rounded-full p-4 panel-cool">
                        <img
                          src={p.image_url}
                          alt=""
                          aria-hidden="true"
                          width={48}
                          height={48}
                          className="size-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <h3 className="font-heading text-lg font-semibold">{p.title}</h3>

                    {/* W bazie część filarów ma w `body_md` dosłowne
                        „(wkrótce)”. Zamiast drukować to jako zdanie,
                        pokazujemy odznakę - tak samo jak na stronie głównej. */}
                    {isComingSoon(p.body_md) ? (
                      <span className="badge mt-3">Wkrótce</span>
                    ) : (
                      p.body_md && (
                        <div className="prose muted mt-2 max-w-none text-sm">
                          <ReactMarkdown>{p.body_md}</ReactMarkdown>
                        </div>
                      )
                    )}
                  </article>
                </Reveal>
              ))}
            </ul>
          </section>
        )}
      </Page>
    </>
  );
}
