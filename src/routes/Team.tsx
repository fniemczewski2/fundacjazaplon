import React from 'react';
import Seo from '../components/Seo';
import { listTeam, TeamMember } from '../lib/team';
import { FaUser } from 'react-icons/fa6';

export default function Team() {
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await listTeam();
      setTeam(data);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Seo
        title="Zespół | Fundacja „Zapłon”"
        description="Poznaj zespół Fundacji Zapłon — osoby, które tworzą projekty społeczne, wspierają społeczność i budują kapitał społeczny."
      />

      <h1 className="section-title">Zespół fundacji</h1>

      <main
        className="mt-6 p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        aria-labelledby="team-title"
      >
        <h2 id="team-title" className="sr-only">
          Członkowie zespołu
        </h2>

        {loading && <p className="opacity-70">Wczytywanie…</p>}

        {!loading && team.length === 0 && (
          <p className="opacity-70">Brak danych o zespole.</p>
        )}

        {!loading &&
          team.map((member) => (
            <article
              key={member.name}
              className="card p-5 flex flex-col items-start"
              aria-label={`Członek zespołu: ${member.name}`}
            >
              {member.photo_url ? (
                <img
                  src={member.photo_url}
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
