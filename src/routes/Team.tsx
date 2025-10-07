import React from 'react'
import Seo from '../components/Seo'
import { listTeam, TeamMember } from '../lib/team'
import { FaUser } from 'react-icons/fa6'

export default function Team() {
  const [team, setTeam] = React.useState<TeamMember[]>([])
  React.useEffect(() => { listTeam().then(setTeam) }, [])

  return (
    <>
      <Seo title="Zespół | Fundacja Zapłon" />
      <h1 className="section-title">Zespół fundacji</h1>
      <div className="mt-6 p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(member => (
          <article key={member.name} className="card p-5">
            {member.photo_url ? 
              (
                <img src={member.photo_url} alt={`${member.name} zdjęcie`} className="h-20 w-20 rounded-full object-cover" loading="lazy" />
              ) : (
                <FaUser className="h-20 w-20 text-accent-orange" />
              )
            }
            <h3 className="mt-4 text-xl font-semibold">{member.name}</h3>
            <p className="opacity-80">{member.role}</p>
            {member.bio_md && <p className="mt-3 text-sm opacity-80">{member.bio_md}</p>}
          </article>
        ))}
      </div>
    </>
  )
}