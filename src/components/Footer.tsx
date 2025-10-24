import React, { useEffect, useState } from 'react'
import { getSocialLinks, SocialLinks } from '../lib/social';
import { FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";

export default function Footer() {

  const [links, setLinks] = useState<SocialLinks | null>(null);

  useEffect(() => {
    getSocialLinks().then(setLinks);
  }, []);

  return (
    <footer className="bg-base-200 border-t border-white/10">
      <div className="container-max py-10 grid md:grid-cols-3 gap-8 text-sm text-text-black">
        <div>
          <img src="/images/logo.svg" alt="Logo" className="h-8 w-8 mb-3 logo" />
          <p>© {new Date().getFullYear()} Fundacja „Zapłon”. Wszelkie prawa zastrzeżone.</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Kontakt</p>
          <p><a href="mailto:biuro@zaplon.org.pl" className="underline">biuro@zaplon.org.pl</a></p>
          <p>Baranówko 19B, 62-050 Mosina</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Śledź nas</p>
          <ul className="flex gap-4">
          {links?.facebook && (
            <li>
              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="hover:text-brand hover:underline text-lg transition-colors flex flex-nowrap items-center "
              >
                <FaFacebook />&nbsp;Facebook
              </a>
            </li>
          )}
          {links?.instagram && (
            <li>
              <a
                href={links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-brand hover:underline text-lg transition-colors flex flex-nowrap items-center "
              >
                <FaInstagram />&nbsp;Instagram
              </a>
            </li>
          )}
          {links?.twitter && (
            <li>
              <a
                href={links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="hover:text-brand hover:underline text-lg transition-colors flex flex-nowrap items-center "
              >
                <FaXTwitter />&nbsp;X
              </a>
            </li>
          )}

        </ul>
        </div>
      </div>
    </footer>
  )
}