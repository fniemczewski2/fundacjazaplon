import React from 'react'
import Hero from '../components/Hero'
import Seo from '../components/Seo'
import JoinUsCard from '../components/JoinUsCard'
import DonateCard from '../components/DonateCard'

export default function Home() {
  return (
    <>
      <Seo title="Fundacja „Zapłon”" description="Wspieramy społeczność – dołącz do nas!" />
      <Hero
        title="Zapalamy aktywność"
        subtitle="Wspieramy osoby angażujące się społecznie i motywujemy do działania. Budujemy kapitał społeczny i zaufanie do organizacji pozarządowych. Dajemy narzędzia do zmiany."
        cta={{ label: 'Wesprzyj nas', href: '#donate' }}
      />
      <DonateCard donateUrl='test' />
      <JoinUsCard />
    </>
  )
}