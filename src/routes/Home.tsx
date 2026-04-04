import React from 'react';
import Hero from '../components/Hero';
import Seo from '../components/Seo';
import JoinUsCard from '../components/JoinUsCard';
import DonateCard from '../components/DonateCard';
import NewsletterCard from '../components/NewsletterCard';

export default function Home() {
  return (
    <>
      <Seo
        title="Fundacja „Zapłon” - wspieramy aktywność społeczną"
        description="Fundacja „Zapłon” wspiera osoby angażujące się społecznie, buduje kapitał społeczny i wzmacnia organizacje pozarządowe. Dołącz do naszych działań i pomóż nam zapalać aktywność."
      />

      <main>

        <section aria-labelledby="hero-title">
          <h1 id="hero-title" className="sr-only">
            Fundacja „Zapłon" – zapalamy aktywność społeczną
          </h1>
          <Hero
            title="Zapalamy aktywność"
            subtitle="Wspieramy osoby angażujące się społecznie i motywujemy do działania. Budujemy kapitał społeczny i zaufanie do organizacji pozarządowych. Dajemy narzędzia do zmiany."
            cta={{ label: 'Wspieram', href: '#donate' }}
          />
        </section>

        <section
          aria-labelledby="mission-title"
          className="mt-16 card p-8"
        >
          <h2 id="mission-title" className="section-title text-center">
            Kim jesteśmy i&nbsp;dla kogo działamy
          </h2>
          <p className="mt-4 text-lg opacity-80 max-w-2xl mx-auto text-center leading-relaxed">
            My — młode osoby — w odpowiedzi na kryzysy współczesnego świata tworzymy przestrzeń
            wspierającą osoby aktywistyczne, wolontariackie i&nbsp;działające społecznie.
            Chcemy być fundacją-matronką kolektywów, ruchów i&nbsp;organizacji.
          </p>
        </section>

        <section id="donate" aria-labelledby="donate-title" className="mt-10">
          <h2 id="donate-title" className="sr-only">
            Wspieram Fundację „Zapłon"
          </h2>
          <DonateCard />
        </section>

        <section aria-labelledby="newsletter-title" className="mt-10">
          <h2 id="newsletter-title" className="sr-only">
            Newsletter Fundacji „Zapłon"
          </h2>
          <NewsletterCard />
        </section>

        <section aria-labelledby="volunteer-title" className="mt-10">
          <h2 id="volunteer-title" className="sr-only">
            Dołącz do Fundacji „Zapłon"
          </h2>
          <JoinUsCard />
        </section>

      </main>
    </>
  );
}