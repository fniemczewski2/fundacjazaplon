import React from 'react';
import { Link, useLocation } from 'wouter';
import { useJoinLink } from '../hooks/useAppData';
import ThemeSwitcher from './ThemeSwitcher';

const NAV_ITEMS = [
  { to: '/aktualnosci', label: 'Aktualności' },
  { to: '/o-nas', label: 'O\u00A0nas' },
  { to: '/zespol', label: 'Zespół' },
  { to: '/dokumenty', label: 'Dokumenty' },
  { to: '/materialy', label: 'Materiały' },
  { to: '/kontakt', label: 'Kontakt' },
];

export default function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(() => globalThis.scrollY > 12);
  const [location] = useLocation();
  const [menuLocation, setMenuLocation] = React.useState(location);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const headerRef = React.useRef<HTMLElement>(null);

  const { data: joinLink } = useJoinLink();
  const joinUrl = joinLink?.survey_url ?? null;

  // Zmiana trasy zamyka menu mobilne (korekta stanu w trakcie renderu zamiast efektu).
  if (menuLocation !== location) {
    setMenuLocation(location);
    setOpen(false);
  }

  // Po ~12 px przewinięcia pasek się spłaszcza.
  React.useEffect(() => {
    const onScroll = () => setScrolled(globalThis.scrollY > 12);
    globalThis.addEventListener('scroll', onScroll, { passive: true });
    return () => globalThis.removeEventListener('scroll', onScroll);
  }, []);

  // Escape zamyka menu i oddaje fokus przyciskowi, który je otworzył -
  // bez tego fokus zostaje w zwiniętym, niewidocznym panelu.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [open]);

  // Kliknięcie poza nagłówkiem zamyka menu mobilne.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !headerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const linkClass = (isActive: boolean) =>
    [
      'py-2 underline-offset-8 transition-colors hover:text-on-brand hover:underline',
      isActive ? 'text-on-brand underline decoration-ember decoration-2' : 'text-on-brand/90',
    ].join(' ');

  return (
    <header ref={headerRef} className="on-brand sticky top-0 z-50 border-b border-on-brand/10 bg-brand text-on-brand">
      <nav aria-label="Główne" className="container-max">
        <div
          className={[
            'flex items-center justify-between gap-4 transition-[padding] duration-300',
            scrolled ? 'py-2' : 'py-3 md:py-4',
          ].join(' ')}
        >
          <Link href="/" className="flex shrink-0 items-center" aria-label="Fundacja Zapłon - strona główna">
            <img
              src="/images/logo.svg"
              alt="Fundacja Zapłon"
              width={104}
              height={64}
              className={[
                'w-auto transition-[height] duration-300',
                scrolled ? 'h-11' : 'h-14 md:h-16',
              ].join(' ')}
            />
          </Link>

          {/* Nawigacja - desktop */}
          <ul className="hidden items-center gap-5 text-sm lg:flex lg:gap-7 lg:text-base xl:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.to;
              return (
                <li key={item.to}>
                  <Link
                    href={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={linkClass(isActive)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Działania - desktop */}
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            {joinUrl && (
              <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Dołączam
              </a>
            )}
            <Link href="/#donate" className="btn btn-ember">
              Wspieram
            </Link>
            <ThemeSwitcher />
          </div>

          {/* Działania - mobile */}
          <div className="flex shrink-0 items-center gap-1 xl:hidden">
            <ThemeSwitcher />
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((s) => !s)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
              className="btn btn-ghost px-3 text-on-brand"
            >
              <span className="relative block size-5" aria-hidden="true">
                <span
                  className={`absolute inset-x-0 top-0.5 h-0.75 rounded-full bg-current transition duration-300 ${
                    open ? 'translate-y-2 rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute inset-x-0 top-2.5 h-0.75 rounded-full bg-current transition duration-300 ${
                    open ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute inset-x-0 top-4.5 h-0.75 rounded-full bg-current transition duration-300 ${
                    open ? '-translate-y-2 -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu mobilne. `inert` (React 19) wyjmuje zwinięty panel z kolejności tabulacji i z drzewa dostępności. */}
      <div
        id="mobile-menu"
        inert={!open}
        className={`overflow-hidden transition-[max-height] duration-300 xl:hidden ${
          open ? 'max-h-144' : 'max-h-0'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-out-soft)' }}
      >
        <div className="container-max pb-4">
          <ul className="flex flex-col gap-1 border-t border-on-brand/15 pt-3">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.to;
              return (
                <li key={item.to}>
                  <Link
                    href={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-on-brand transition ${
                      isActive ? 'bg-on-brand/12 font-semibold' : 'hover:bg-on-brand/8'
                    }`}
                  >
                    {isActive && (
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-ember" />
                    )}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-col gap-2">
            {joinUrl && (
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full"
              >
                Dołączam
              </a>
            )}
            <Link href="/#donate" className="btn btn-ember w-full">
              Wspieram
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
