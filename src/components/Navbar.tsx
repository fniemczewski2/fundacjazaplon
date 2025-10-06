import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import ThemeSwitcher from './ThemeSwitcher'

export default function Navbar() {
  return (
    <header className=" text-text-black bg-base-200 sticky top-0 z-50 backdrop-blur">
      <nav className="container-max flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/images/logo.svg" alt="Logo" className="h-8 w-8 logo" />
          <span className="font-semibold">Fundacja Zapłon</span>
        </Link>
        <ul className="hidden md:flex items-center gap-6">
          {[
            { to: '/o-nas', label: 'O nas' },
            { to: '/projekty', label: 'Projekty' },
            { to: '/zespol', label: 'Zespół' },
            { to: '/aktualnosci', label: 'Aktualności' },
          ].map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `hover:opacity-80 ${isActive ? 'underline underline-offset-8 decoration-brand' : ''}`}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <a className="btn btn-primary" href="#donate">Wesprzyj</a>
          <ThemeSwitcher />
        </div>
      </nav>
    </header>
  )
}