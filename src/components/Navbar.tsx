// src/components/Navbar.tsx
import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getJoinLink } from '../lib/join';
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
  const location = useLocation();

  // POPRAWKA #9: pobieramy URL ankiety wolontariatu, by pokazać przycisk "Dołącz"
  const [joinUrl, setJoinUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    getJoinLink().then((data) => setJoinUrl(data?.survey_url ?? null));
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-brand text-white shadow-md">
      <nav className="container-max flex items-center justify-between py-3 md:py-4">

        <Link to="/" className="flex items-center gap-3">
          <img
            src="/images/logo.svg"
            alt="Logo Fundacji Zapłon"
            className="h-16 w-auto md:h-14 logo"
          />
        </Link>
        <ul className="hidden md:flex text-sm lg:text-base lg:gap-6 gap-4 items-center text-white">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `hover:opacity-80 transition ${
                    isActive ? 'underline underline-offset-8 decoration-brand' : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* CTA + Theme (desktop) */}
        <div className="hidden md:flex items-center gap-2 text-text-black">

          {joinUrl && (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Dołączam
            </a>
          )}
          <a className="btn btn-primary" href="/#donate">Wspieram</a>
          <ThemeSwitcher />
        </div>

        <div className="md:hidden flex items-center text-text-black gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Otwórz menu"
            className="inline-flex items-center justify-center btn btn-ghost"
          >
            <span className="sr-only">Menu</span>
            <div className="relative w-5 h-5">
              <span
                className={`absolute inset-x-0 top-0 h-[3px] rounded-full bg-current transition ${
                  open ? 'translate-y-2 rotate-45' : ''
                }`}
              />
              <span
                className={`absolute inset-x-0 top-2 h-[3px] rounded-full bg-current transition ${
                  open ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute inset-x-0 top-4 h-[3px] rounded-full bg-current transition ${
                  open ? '-translate-y-2 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 z-30 text-text-black ${
          open ? 'max-h-[32rem]' : 'max-h-0'
        }`}
      >
        <div className="container-max pb-3">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 transition text-white ${
                      isActive ? 'underline underline-offset-8 decoration-brand' : ''
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}

            {/* CTA buttons w mobile */}
            <li className="px-1 flex flex-col gap-2 mt-2">
              {joinUrl && (
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full"
                >
                  Dołącz do wolontariatu
                </a>
              )}
              <a className="btn btn-secondary w-full" href="/#donate" onClick={() => setOpen(false)}>
                Wspieram
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}