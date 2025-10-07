import React from 'react'

export default function Hero({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: { label: string; href: string } }) {
  return (
    <section className="container-max mt-8 gap-8 items-center flex justify-between">
      <div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-text-black">
          {title}
        </h1>
        {subtitle && <p className="mt-4 text-lg opacity-80">{subtitle}</p>}
        {cta && <a href={cta.href} className="btn btn-primary mt-6 inline-flex">{cta.label}</a>}
      </div>
      <img
        src="/images/main-logo.svg"
        alt="Działania organizacji"
        className="hidden dark:hidden md:block rounded-2xl shadow-md shadow-accent-orange/70 px-10"
        loading="lazy"
      />
      <img
        src="/images/main-logo-dark.svg"
        alt="Działania organizacji"
        className="hidden md:dark:block rounded-2xl shadow-md shadow-accent-orange/70 px-10"
        loading="lazy"
      />
    </section>
  )
}