import React from 'react'

export default function Hero({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: { label: string; href: string } }) {
  return (
    <section className="container-max mt-8 grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-text-black">
          {title}
        </h1>
        {subtitle && <p className="mt-4 text-lg opacity-80">{subtitle}</p>}
        {cta && <a href={cta.href} className="btn btn-primary mt-6 inline-flex">{cta.label}</a>}
      </div>
      <div className="relative">
        <img src="/images/hero.jpg" alt="Działania organizacji" className="rounded-2xl shadow-lg" loading="lazy" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none text-text-black"></div>
      </div>
    </section>
  )
}