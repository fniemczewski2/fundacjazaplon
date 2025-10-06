import React from 'react'
import Seo from '../components/Seo'
import { getTeam, TeamMember } from '../lib/content'

export default function Team() {
  const [team, setTeam] = React.useState<TeamMember[]>([])
  React.useEffect(() => { getTeam().then(setTeam) }, [])

  return (
    <>
      <Seo title="Zespół" />
      <h1 className="section-title">Zarząd i zespół</h1>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(member => (
          <article key={member.name} className="card p-5">
            <img src={member.avatar || '/images/placeholders/avatar.svg'} alt="" className="h-20 w-20 rounded-full object-cover" loading="lazy" />
            <h3 className="mt-4 text-xl font-semibold">{member.name}</h3>
            <p className="opacity-80">{member.role}</p>
            {member.bio && <p className="mt-3 text-sm opacity-80">{member.bio}</p>}
          </article>
        ))}
      </div>
    </>
  )
}