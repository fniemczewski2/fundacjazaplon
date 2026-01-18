import React from 'react';
import Hero from '../components/Hero';
import Seo from '../components/Seo';
import JoinUsCard from '../components/JoinUsCard';
import DonateCard from '../components/DonateCard';

export default function Home() {
  return (
    <>
      <Seo
        title="Fundacja „Zapłon” – wspieramy aktywność społeczną"
        description="Fundacja Zapłon wspiera osoby angażujące się społecznie, buduje kapitał społeczny i wzmacnia organizacje pozarządowe. Dołącz do naszych działań i pomóż nam zapalać aktywność."
      />

      <main>
        {/* HERO */}
        <section aria-labelledby="hero-title">
          <h1 id="hero-title" className="sr-only">
            Fundacja Zapłon – zapalamy aktywność społeczną
          </h1>

          <Hero
            title="Zapalamy aktywność"
            subtitle="Wspieramy osoby angażujące się społecznie i motywujemy do działania. Budujemy kapitał społeczny i zaufanie do organizacji pozarządowych. Dajemy narzędzia do zmiany."
            cta={{ label: 'Wesprzyj nas', href: '#donate' }}
          />
        </section>

        {/* DONATE */}
        <section id="donate" aria-labelledby="donate-title" className="mt-10">
          <h2 id="donate-title" className="sr-only">
            Wesprzyj Fundację Zapłon
          </h2>
          <DonateCard donateUrl="#" />
        </section>

        {/* JOIN US */}
        <section aria-labelledby="join-us-title" className="mt-10">
          <h2 id="join-us-title" className="sr-only">
            Dołącz do Fundacji Zapłon
          </h2>
          <JoinUsCard />
        </section>
      </main>
    </>
  );
}
