import Illustration, { type IllustrationName } from './Illustration';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * „Skala zapłonu” — element rozpoznawczy strony głównej.
 *
 * Cztery ilustracje z zestawu fundacji ułożone w rosnącą skalę: od zapałki
 * po wulkan. Kolejność niesie treść (rośnie zasięg działania), więc linia
 * postępu i podpisy nie są dekoracją.
 *
 * Po wczytaniu strony ogień „przebiega” wzdłuż linii i zapala kolejne
 * stopnie. Przy `prefers-reduced-motion: reduce` wszystko renderuje się od
 * razu w stanie końcowym.
 */

type Step = {
  name: IllustrationName;
  label: string;
  caption: string;
};

const STEPS: readonly Step[] = [
  { name: 'zapalki', label: 'Iskra', caption: 'Pomysł jednej osoby' },
  { name: 'plomyk', label: 'Zapłon', caption: 'Pierwsze działanie' },
  { name: 'ognisko', label: 'Ognisko', caption: 'Zespół wokół sprawy' },
  { name: 'wulkan', label: 'Wulkan', caption: 'Zmiana, którą widać' },
];

/** Wysokość pola na ilustrację. Linia postępu kotwiczy się do tej wartości. */
const ART_BOX = '7.5rem';

export default function IgnitionScale({ className = '' }: Readonly<{ className?: string }>) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className={className}>
      <p className="eyebrow mb-6">Skala zapłonu</p>

      <div className="relative">
        {/* Tor z ogniem. Czysta dekoracja — ukryty przed czytnikami ekranu. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[12%] hidden h-px md:block"
          style={{ top: ART_BOX, background: 'var(--color-line)' }}
        >
          <div
            className="h-[3px] w-full origin-left rounded-full"
            style={{
              marginTop: '-1px',
              background:
                'linear-gradient(90deg, var(--color-ember) 0%, #ff8a3d 55%, var(--color-ember-ink) 100%)',
              animation: reduced
                ? undefined
                : 'ignite-line 2200ms var(--ease-out-soft) 250ms both',
            }}
          />
        </div>

        <ol className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {STEPS.map((step, i) => (
            <li
              key={step.name}
              className="flex flex-col items-center text-center"
              style={{
                animation: reduced
                  ? undefined
                  : `ignite-step 620ms var(--ease-out-soft) ${400 + i * 420}ms both`,
              }}
            >
              <div className="flex w-full items-end justify-center" style={{ height: ART_BOX }}>
                <Illustration
                  name={step.name}
                  priority={i < 2}
                  glow
                  className="h-full w-auto"
                />
              </div>

              {/* Węzeł spinający ilustrację z torem. */}
              <span
                aria-hidden="true"
                className="my-3 hidden size-2.5 shrink-0 rounded-full md:block"
                style={{ background: 'var(--color-ember)' }}
              />

              <p className="mt-3 font-heading text-base font-semibold md:mt-0">{step.label}</p>
              <p className="muted mt-0.5 text-sm">{step.caption}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
