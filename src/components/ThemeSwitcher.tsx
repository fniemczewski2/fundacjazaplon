import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa6';

export default function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

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
