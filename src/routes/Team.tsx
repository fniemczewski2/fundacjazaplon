import ReactMarkdown from 'react-markdown';
import { FaPhone, FaUser, FaEnvelope } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Reveal from '../components/Reveal';
import { SkeletonList } from '../components/Skeleton';
import { useTeam } from '../hooks/useAppData';
import { useScrollToHash } from '../hooks/useScrollToHash';

/** Buduje adres `tel:` - dokłada +48, gdy numer zapisano bez prefiksu kraju. */
function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+') ? digits : `+48${digits}`;
  return `tel:${normalized}`;
}

export default function Team() {
  const { data: team = [], isPending: loading, error } = useTeam();

  // Płynne przewinięcie do wizytówki po wejściu z /w/[slug].
  useScrollToHash(!loading);

  return (
    <>
      <Seo
        title="Zespół | Fundacja „Zapłon”"
        description="Poznaj zespół Fundacji „Zapłon”: osoby, które tworzą projekty społeczne, wspierają społeczność i budują kapitał społeczny."
      />

      <Page
        eyebrow="Ludzie"
        title="Zespół fundacji"
        lead="Osoby, które prowadzą projekty, oferują wsparcie i odpisują na Wasze wiadomości."
        illustration="zapalki"
      >
        {loading && <SkeletonList count={4} variant="row" label="Wczytywanie zespołu" />}

        {!loading && error && (
          <p role="alert" className="field-error">
            Nie udało się wczytać danych zespołu.
          </p>
        )}

        {!loading && !error && team.length === 0 && (
          <p className="muted">Nie mamy jeszcze opublikowanych danych o zespole.</p>
        )}

        {!loading && team.length > 0 && (
          <ul className="grid gap-6 lg:grid-cols-2">
            {team.map((member, i) => (
              <Reveal as="li" key={member.id || member.name} delay={i * 80} className="h-full">
                <article
                  id={member.slug || member.id}
                  className="card flex h-full scroll-mt-28 flex-col p-6"
                >
                  <div className="flex items-center gap-4">
                    {member.photo_url ? (
                      <img
                        src={`${member.photo_url}?width=176&height=176&resize=cover&quality=75`}
                        alt={`Zdjęcie: ${member.name}`}
                        width={88}
                        height={88}
                        className="size-22 shrink-0 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="grid size-22 shrink-0 place-items-center rounded-full panel-cool">
                        <FaUser className="size-9 text-ember-ink" aria-hidden="true" />
                      </span>
                    )}

                    <div className="min-w-0">
                      <h2 className="font-heading text-xl font-semibold">{member.name}</h2>
                      {member.role && <p className="muted mt-1 text-sm">{member.role}</p>}
                    </div>
                  </div>

                  {member.bio_md && (
                    <div className="prose muted mt-5 max-w-none text-sm">
                      <ReactMarkdown>{member.bio_md}</ReactMarkdown>
                    </div>
                  )}

                  {(member.phone || member.email) && (
                    <div className="mt-auto flex flex-col gap-2 pt-5">
                      {member.phone && (
                        <a
                          href={toTelHref(member.phone)}
                          className="link-quiet inline-flex items-center gap-2 text-sm"
                        >
                          <FaPhone aria-hidden="true" className="shrink-0" />
                          <span>{member.phone}</span>
                        </a>
                      )}

                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="link-quiet inline-flex items-center gap-2 text-sm break-all"
                        >
                          <FaEnvelope aria-hidden="true" className="shrink-0" />
                          <span>{member.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </ul>
        )}
      </Page>
    </>
  );
}
