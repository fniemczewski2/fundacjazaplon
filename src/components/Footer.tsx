import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-base-200 mt-16 border-t border-white/10">
      <div className="container-max py-10 grid md:grid-cols-3 gap-8 text-sm text-text-black">
        <div>
          <img src="/images/logo.svg" alt="Logo" className="h-8 w-8 mb-3 logo" />
          <p>© {new Date().getFullYear()} Fundacja Zapłon. Wszelkie prawa zastrzeżone.</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Kontakt</p>
          <p><a href="mailto:biuro@zaplon.org.pl" className="underline">biuro@zaplon.org.pl</a></p>
          <p>Baranówko 19B, 62-050 Mosina</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Śledź nas</p>
          <ul className="flex gap-4">
            <li><a href="#" aria-label="Facebook">FB</a></li>
            <li><a href="#" aria-label="Instagram">IG</a></li>
            <li><a href="#" aria-label="X/Twitter">X</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}