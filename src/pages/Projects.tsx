import React from 'react'
import Seo from '../components/Seo'
import { getProjects } from '../lib/content'
import Card from '../components/Card'

export default function Projects() {
  const [projects, setProjects] = React.useState<any[]>([])
  React.useEffect(() => { getProjects().then(setProjects) }, [])

  return (
    <>
      <Seo title="Projekty" />
      <h1 className="section-title">Projekty</h1>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p, i) => (
          <Card key={i}>
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 opacity-80 line-clamp-3">{p.body?.replace(/#.*\n?/, '').slice(0, 180)}…</p>
          </Card>
        ))}
      </div>
    </>
  )
}