import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaPhone, FaUser, FaEnvelope } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Reveal from '../components/Reveal';
import { listTeamPublic, type TeamMember } from '../lib/team';
import { useScrollToHash } from '../hooks/useScrollToHash';

/** Buduje adres `tel:` - dokłada +48, gdy numer zapisano bez prefiksu kraju. */
function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('+') ? digits : `+48${digits}`}`;
}

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      // Musi być `listTeamPublic` (filtruje active=true), nie `listTeam` -
      // ta druga jest dla panelu i pokazywałaby też osoby nieaktywne
      // razem z ich telefonem i adresem e-mail.
      const data = await listTeamPublic();
      if (!alive) return;
      setTeam(data);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Płynne przewinięcie do wizytówki po wejściu z /w/[slug].
  useScrollToHash(!loading);

  return (
    <>
      <Seo
        title="Zespół | Fundacja „Zapłon”"
        description="Poznaj zespół Fundacji „Zapłon” - osoby, które tworzą projekty społeczne, wspierają społeczność i budują kapitał społeczny."
      />

      <Page
        eyebrow="Ludzie"
        title="Zespół fundacji"
        lead="Osoby, które prowadzą projekty, oferują wsparcie i odpisują na Wasze wiadomości."
        illustration="zapalki"
      >
        {loading && <Loader />}

        {!loading && team.length === 0 && (
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
                        alt=""
                        aria-hidden="true"
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
