import React from 'react';
import Reveal from './Reveal';

type Props = {
  title: string;
  children: React.ReactNode;
  id?: string;
  eyebrow?: string;
  lead?: string;
  /** Link „zobacz wszystko” po prawej stronie nagłówka. */
  action?: React.ReactNode;
  /** `grid` układa dzieci w responsywną siatkę, `plain` zostawia je w spokoju. */
  layout?: 'grid' | 'plain';
  align?: 'start' | 'center';
  className?: string;
};

export default function Section({
  title,
  children,
  id,
  eyebrow,
  lead,
  action,
  layout = 'grid',
  align = 'start',
  className = '',
}: Readonly<Props>) {
  // Nagłówek dostaje id, żeby `aria-labelledby` wskazywało na realny tekst,
  // a nie na ukryty duplikat.
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section id={id} aria-labelledby={headingId} className={`section-gap ${className}`}>
      <Reveal className={align === 'center' ? 'text-center' : ''}>
        <div
          className={
            action
              ? 'flex flex-wrap items-end justify-between gap-4'
              : align === 'center'
                ? 'mx-auto max-w-2xl'
                : 'max-w-3xl'
          }
        >
          <div className={align === 'center' && !action ? 'mx-auto' : ''}>
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            <h2 id={headingId} className="section-title">
              {title}
            </h2>
            {lead && <p className="lead mt-4">{lead}</p>}
          </div>
          {action}
        </div>
      </Reveal>

      <div
        className={
          layout === 'grid'
            ? 'mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
            : 'mt-10'
        }
      >
        {children}
      </div>
    </section>
  );
}
