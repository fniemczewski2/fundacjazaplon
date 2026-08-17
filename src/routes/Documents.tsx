import { useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Reveal from '../components/Reveal';
import { ALL_CATEGORIES, type DocCategory, listDocuments } from '../lib/documents';

type Group = {
  key: DocCategory;
  label: string;
  items: Array<{ name: string; url: string }>;
};

/** Ze „Sprawozdanie_finansowe_2024.pdf” robi czytelną nazwę dla człowieka. */
function prettyName(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

export default function Documents() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      // Kategorie pobieramy równolegle — sekwencyjna pętla kazała czekać
      // na sumę wszystkich zapytań zamiast na najwolniejsze z nich.
      const res = await Promise.all(
        ALL_CATEGORIES.map(async (c) => ({
          key: c.key,
          label: c.label,
          items: (await listDocuments(c.key)).map((i) => ({ name: i.name, url: i.url })),
        })),
      );

      if (!alive) return;
      setGroups(res);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

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
        lead="Statut, uchwały i sprawozdania. Wszystko, czego można od nas oczekiwać — w jednym miejscu."
        illustration="fabryka"
        width="prose"
      >
        {loading && <Loader />}

        {!loading && nonEmpty.length === 0 && (
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
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <span className="min-w-0 text-sm break-words">{prettyName(item.name)}</span>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary shrink-0 px-4 py-2 text-sm"
                      >
                        Pobierz
                        <FaDownload aria-hidden="true" />
                        {/* Nazwa pliku w etykiecie — bez niej lista linków
                            w czytniku ekranu to sześć razy „Pobierz”. */}
                        <span className="sr-only">: {prettyName(item.name)}</span>
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
