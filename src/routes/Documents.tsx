import { FaDownload } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Reveal from '../components/Reveal';
import { SkeletonList } from '../components/Skeleton';
import { useDocumentGroups } from '../hooks/useAppData';

export default function Documents() {
  const { data: groups = [], isPending: loading, error } = useDocumentGroups();
  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <>
      <Seo
        title="Dokumenty | Fundacja „Zapłon”"
        description="Pobierz dokumenty Fundacji „Zapłon”: statut, uchwały, sprawozdania finansowe i merytoryczne."
      />

      <Page
        eyebrow="Jawność"
        title="Dokumenty"
        lead="Statut, uchwały i sprawozdania. Wszystko, czego można od nas oczekiwać, w jednym miejscu."
        illustration="fabryka"
        width="prose"
      >
        {loading && <SkeletonList count={3} variant="row" label="Wczytywanie dokumentów" />}

        {!loading && error && (
          <p role="alert" className="field-error">
            Nie udało się wczytać dokumentów.
          </p>
        )}

        {!loading && !error && nonEmpty.length === 0 && (
          <p className="muted">Nie opublikowaliśmy jeszcze żadnych dokumentów.</p>
        )}

        <div className="space-y-6">
          {nonEmpty.map((g, gi) => (
            <Reveal key={g.key} delay={gi * 90}>
              <section aria-labelledby={`docs-${g.key}`} className="card p-6 md:p-8">
                <h2 id={`docs-${g.key}`} className="font-heading text-xl font-semibold">
                  {g.label}
                </h2>

                <ul className="mt-4 divide-y">
                  {g.items.map((item) => (
                    <li
                      key={item.url}
                      className="flex flex-nowrap items-center justify-between gap-3 py-3"
                    >
                      <span className="min-w-0 break-words">{item.name}</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary shrink-0 px-4 py-2 text-sm"
                      >
                        Pobierz
                        <FaDownload aria-hidden="true" />
                        <span className="sr-only">: {item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>
      </Page>
    </>
  );
}
