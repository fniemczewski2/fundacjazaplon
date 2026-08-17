import { useEffect, useState } from 'react';
import { FaPhone, FaUser, FaEnvelope } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Reveal from '../components/Reveal';
import { listTeamPublic, type TeamMember } from '../lib/team';
import { useScrollToHash } from '../hooks/useScrollToHash';

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      // Musi być `listTeamPublic` (filtruje active=true), nie `listTeam` —
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
        description="Poznaj zespół Fundacji „Zapłon” — osoby, które tworzą projekty społeczne, wspierają społeczność i budują kapitał społeczny."
      />

      <Page
        eyebrow="Ludzie"
        title="Zespół fundacji"
        lead="Osoby, które odbierają telefon, prowadzą projekty i odpisują na Wasze wiadomości."
        illustration="plomyk"
      >
        {loading && <Loader />}

        {!loading && team.length === 0 && (
          <p className="muted">Nie mamy jeszcze opublikowanych danych o zespole.</p>
        )}

        {!loading && team.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member, i) => (
              <Reveal as="li" key={member.id || member.name} delay={i * 80} className="h-full">
                <article
                  id={member.slug || member.id}
                  className="card card-interactive flex h-full scroll-mt-28 flex-col p-6"
                >
                  {member.photo_url ? (
                    <img
                      src={`${member.photo_url}?width=160&height=160&resize=cover&quality=75`}
                      alt=""
                      aria-hidden="true"
                      width={80}
                      height={80}
                      className="size-20 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid size-20 place-items-center rounded-full panel-cool">
                      <FaUser className="size-9 text-ember-ink" aria-hidden="true" />
                    </span>
                  )}

                  <h2 className="mt-5 font-heading text-xl font-semibold">{member.name}</h2>

                  {member.role && <p className="muted mt-1 text-sm">{member.role}</p>}

                  {member.bio_md && (
                    <p className="muted mt-4 text-sm leading-relaxed">{member.bio_md}</p>
                  )}

                  {(member.phone || member.email) && (
                    <div className="mt-auto flex flex-col gap-2 pt-5">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/\s+/g, '')}`}
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
