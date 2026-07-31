import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa6';

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  // Ten sam fallback co blokujący skrypt anty-FOUC w index.html — dla nowych
  // odwiedzających bez zapisanej preferencji szanujemy ustawienia systemowe
  // zamiast zawsze zakładać jasny motyw.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(getInitialTheme);

  React.useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      className="btn btn-ghost text-2xl text-text-navbar"
      onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
      aria-label="Przełącz motyw"
    >
      {theme === 'light' ? <FaMoon /> : <FaSun />}
    </button>
  );
}
