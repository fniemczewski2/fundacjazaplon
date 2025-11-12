import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';

const NAV_ITEMS = [
  { to: '/aktualnosci', label: 'Aktualności' },
  { to: '/o-nas', label: 'O\u00A0nas' },
  { to: '/zespol', label: 'Zespół' },
  { to: '/dokumenty', label: 'Dokumenty' },
  { to: '/kontakt', label: 'Kontakt' },
];

export default function Navbar() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-base-200/80 border-b">
      <nav className="container-max flex items-center justify-between py-3 md:py-4">
        {/* Logo + Brand */}
        <Link to="/" className="flex items-center gap-3">
          {/* swap for dark if you have dark variant; otherwise keep single */}
          <img src="/images/logo.svg" alt="Logo" className="h-16 w-26 md:h-14 md:w-26 logo" />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex text-sm lg:text-base lg:gap-6 gap-4 items-center text-text-black">
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
          <a className="btn btn-primary" href="/#donate">Wesprzyj</a>
          <ThemeSwitcher />
        </div>

        {/* Mobile: hamburger */}
        <div className="md:hidden flex items-center text-text-black gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Otwórz menu"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-base-100"
          >
            <span className="sr-only">Menu</span>
            <div className="relative w-5 h-5">
              <span
                className={`absolute inset-x-0 top-1 h-0.5 bg-current transition ${
                  open ? 'translate-y-1.5 rotate-45' : ''
                }`}
              />
              <span
                className={`absolute inset-x-0 top-2.5 h-0.5 bg-current transition ${
                  open ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute inset-x-0 top-4 h-0.5 bg-current transition ${
                  open ? '-translate-y-1.5 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 z-30 text-text-black ${
          open ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="container-max pb-3">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 transition ${
                      isActive ? 'underline underline-offset-8 decoration-brand' : ''
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="px-1">
              <a
                className="btn btn-primary w-full mt-2"
                href="/#donate"
              >
                Wesprzyj
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
