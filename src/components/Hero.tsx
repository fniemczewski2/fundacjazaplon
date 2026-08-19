import { Link } from 'wouter';
import { FaArrowRight } from 'react-icons/fa6';
import Illustration from './Illustration';

type Cta = { label: string; href: string; external?: boolean };

type Props = {
  eyebrow?: string;
  title: string;
  highlight: string;
  subtitle?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
};

function CtaLink({ cta, className }: Readonly<{ cta: Cta; className: string }>) {
  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className}>
        {cta.label}
        <FaArrowRight aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link href={cta.href} className={className}>
      {cta.label}
      <FaArrowRight aria-hidden="true" />
    </Link>
  );
}

export default function Hero({
  eyebrow,
  title,
  highlight,
  subtitle,
  primaryCta,
  secondaryCta,
}: Readonly<Props>) {
  return (
    <div className="relative overflow-hidden panel-warm border-b">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 32rem at 88% -12%, rgb(255 169 98 / 0.30), transparent 62%)',
        }}
      />
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative container-max py-16 md:py-24">
        <div className='flex justify-between items-center'>
        <div className="max-w-4xl">
          {eyebrow && <p className="eyebrow animate-fade-in mb-6">{eyebrow}</p>}

          <h1 className="display">
            {title}
            <br />
            <span className="text-gradient-ember">{highlight}</span>
          </h1>

          {subtitle && <p className="lead mt-7 max-w-2xl">{subtitle}</p>}

          {(primaryCta || secondaryCta) && (
            <div className="mt-9 flex flex-wrap gap-3">
              {primaryCta && <CtaLink cta={primaryCta} className="btn btn-ember" />}
              {secondaryCta && <CtaLink cta={secondaryCta} className="btn btn-secondary" />}
            </div>
          )}
        </div>
        <Illustration name="zapalki" className="md:w-[30vw] hidden sm:inline"/>
        </div>
        <hr className="mt-14 border-t md:mt-20" />
      </div>
    </div>
  );
}
