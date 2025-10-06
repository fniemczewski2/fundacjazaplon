import React from 'react'

export default function ThemeSwitcher() {
  const [theme, setTheme] = React.useState(
    () => localStorage.getItem('theme') || 'light'
  )

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button className="btn btn-ghost" onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
      {theme === 'light' ? '🌙' : '☀️'}
      <span className="sr-only">Przełącz motyw</span>
    </button>
  )
}