// src/routes/Contact.tsx
import { useEffect, useState } from 'react';
import Seo from '../components/Seo';
import { getContact, type ContactInfo } from '../lib/contact';
import Card from '../components/Card';
import { FiCopy, FiCheck } from 'react-icons/fi';
import ContactForm from '../components/ContactForm';

export default function Contact() {
  const [data, setData] = useState<ContactInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getContact().then(setData);
  }, []);

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  return (
    <>
      <Seo
        title="Kontakt | Fundacja „Zapłon”"
        description="Skontaktuj się z Fundacją Zapłon. Dane adresowe, telefon, email, numer konta oraz formularz kontaktowy."
      />

      <h1 className="section-title">Kontakt</h1>

      <div className="container mt-6 p-4 max-w-4xl grid md:grid-cols-2 gap-6">
        <section aria-labelledby="contact-form">
          <h2 id="contact-form" className="sr-only">
            Formularz kontaktowy
          </h2>
          <ContactForm />
        </section>

        <Card>
          <section aria-labelledby="contact-data">
            <h2 id="contact-data" className="text-2xl font-semibold mb-4">
              Fundacja „Zapłon”
            </h2>

            {!data && <p className="opacity-70">Wczytywanie danych…</p>}

            {data && (
              <div className="space-y-4 w-full">
                {data.address && (
                  <div>
                    <div className="text-sm text-text-black/70">Adres</div>
                    <div className="text-lg">{data.address}</div>
                  </div>
                )}

                {['krs', 'nip', 'regon', 'account_number'].map((key) => {
                  const labelMap: Record<string, string> = {
                    krs: 'KRS',
                    nip: 'NIP',
                    regon: 'REGON',
                    account_number: 'Numer konta',
                  };

                  const value = (data as any)[key];
                  if (!value) return null;

                  return (
                    <div key={key} className="group relative">
                      <div className="text-sm text-text-black/70">{labelMap[key]}</div>

                      <div className="flex items-center gap-2 text-lg">
                        <span>{value}</span>
                        <button
                          onClick={() => copyToClipboard(key, value)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-black/70 hover:text-black"
                          aria-label={`Skopiuj ${labelMap[key]}`}
                        >
                          {copied === key ? <FiCheck /> : <FiCopy />}
                        </button>
                      </div>

                      {copied === key && (
                        <div className="absolute text-xs text-brand mt-0.5">Skopiowano!</div>
                      )}
                    </div>
                  );
                })}

                {data.phone && (
                  <div>
                    <div className="text-sm text-text-black/70">Telefon</div>
                    <a href={`tel:${data.phone}`} className="hover:underline text-lg">
                      {data.phone}
                    </a>
                  </div>
                )}

                {data.email && (
                  <div>
                    <div className="text-sm text-text-black/70">Email</div>
                    <a href={`mailto:${data.email}`} className="hover:underline text-lg">
                      {data.email}
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        </Card>
      </div>
    </>
  );
}
