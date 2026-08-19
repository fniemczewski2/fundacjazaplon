import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa6';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage bywa zablokowany (tryb prywatny, polityka cookies).
  }
  // Ten sam fallback co skrypt anty-FOUC w index.html: dla nowych osób
  // szanujemy ustawienie systemowe zamiast zakładać jasny motyw.
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;

    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Brak zapisu to nie powód, żeby przełącznik przestał działać
      // w bieżącej sesji.
    }
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      // `aria-pressed` mówi czytnikowi ekranu, czy tryb ciemny jest włączony.
      // Sama zamiana ikony słońca na księżyc niesie tę informację wyłącznie
      // wzrokowo.
      aria-pressed={isDark}
      aria-label="Tryb ciemny"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="btn btn-ghost px-3 text-xl text-white"
    >
      {isDark ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
    </button>
  );
}
