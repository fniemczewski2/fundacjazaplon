import { useEffect, useState } from 'react';
import Seo from '../components/Seo';
import { listTeamPublic, type TeamMember } from '../lib/team';
import { FaPhone, FaUser, FaEnvelope } from 'react-icons/fa6';
import Loader from '../components/Loader';
import { useScrollToHash } from '../hooks/useScrollToHash';

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // UWAGA: to musi być listTeamPublic (filtruje active=true), nie listTeam() —
      // ta druga jest przeznaczona dla panelu admina i pokazywałaby też osoby
      // dawno nieaktywne, razem z ich telefonem i e-mailem.
      const data = await listTeamPublic();
      setTeam(data);
      setLoading(false);
    })();
  }, []);

  // Płynne przewinięcie do wizytówki po wejściu z /w/[slug] — wspólny hook,
  // używany też np. na stronie głównej dla kotwicy #donate.
  useScrollToHash(!loading);

  return (
    <>
      <Seo
        title="Zespół | Fundacja „Zapłon”"
        description="Poznaj zespół Fundacji „Zapłon” — osoby, które tworzą projekty społeczne, wspierają społeczność i budują kapitał społeczny."
      />

      <h1 className="section-title">Zespół fundacji</h1>

      <main
        className="mt-6 p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        aria-labelledby="team-title"
      >
        <h2 id="team-title" className="sr-only">
          Członkowie zespołu
        </h2>

        {loading && <Loader />}

        {!loading && team.length === 0 && (
          <p className="opacity-70">Brak danych o zespole.</p>
        )}

        {!loading &&
          team.map((member) => (
            <article
              key={member.id || member.name}
              id={member.slug || member.id} 
              className="card p-5 flex flex-col items-start scroll-mt-24" 
              aria-label={`Członek zespołu: ${member.name}`}
            >
              {member.photo_url ? (
                <img
                  src={`${member.photo_url}?width=160&height=160&resize=cover&quality=75`}
                  alt={`Zdjęcie: ${member.name}`}
                  className="h-20 w-20 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <FaUser
                  className="h-20 w-20 text-accent-orange"
                  aria-hidden="true"
                />
              )}

              <h3 className="mt-4 text-xl font-semibold">{member.name}</h3>

              {member.role && (
                <p className="opacity-80 text-sm">{member.role}</p>
              )}

              {/* DANE KONTAKTOWE */}
              {(member.phone || member.email) && (
                <div className="mt-4 flex flex-col gap-2 w-full">
                  {member.phone && (
                    <a
                      href={`tel:${member.phone.replace(/\s+/g, '')}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 transition-colors"
                    >
                      <FaPhone size={16} className="text-gray-500" aria-hidden="true" />
                      <span>{member.phone}</span>
                    </a>
                  )}

                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 transition-colors break-all"
                    >
                      <FaEnvelope size={16} className="text-gray-500" aria-hidden="true" />
                      <span>{member.email}</span>
                    </a>
                  )}
                </div>
              )}

              {member.bio_md && (
                <p className="mt-3 text-sm opacity-80 leading-relaxed">
                  {member.bio_md}
                </p>
              )}
            </article>
          ))}
      </main>
    </>
  );
}