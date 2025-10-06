import React from 'react'
import Hero from '../components/Hero'
import Section from '../components/Section'
import Card from '../components/Card'
import Seo from '../components/Seo'
import { getProjects } from '../lib/content'

export default function Home() {
  const [projects, setProjects] = React.useState<any[]>([])

  React.useEffect(() => { getProjects().then(setProjects) }, [])

  return (
    <>
      <Seo title="Fundacja Zapłon" description="Wspieramy społeczność – dołącz do nas!" />
      <Hero
        title="Działamy dla społeczności"
        subtitle="Wspólnie tworzymy lepszą przyszłość. Dołącz do naszych działań."
        cta={{ label: 'Wesprzyj nas', href: '#donate' }}
      />
      <Section title="Najnowsze projekty">
        {projects.map((p, i) => (
          <Card key={i}>
            <h3 className="text-xl font-semibold">{p.title}</h3>
            <p className="mt-2 opacity-80 line-clamp-3">{p.body?.replace(/#.*\n?/, '').slice(0, 180)}…</p>
          </Card>
        ))}
      </Section>
      <section id="donate" className="mt-16 card p-8 text-center">
        <h2 className="section-title">Wesprzyj nas</h2>
        <p className="mt-3">Przelew tradycyjny: 00 0000 0000 0000 0000 0000 0000</p>
        <a className="btn btn-primary mt-4 inline-flex" href="#">Przekaż darowiznę</a>
      </section>
    </>
  )
}