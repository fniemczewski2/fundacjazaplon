import { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Reveal from '../components/Reveal';
import ContactForm from '../components/ContactForm';
import { useContactInfo } from '../hooks/useAppData';

const COPYABLE = [
  { key: 'krs', label: 'KRS' },
  { key: 'nip', label: 'NIP' },
  { key: 'regon', label: 'REGON' },
  { key: 'account_number', label: 'Numer konta' },
  { key: 'online_address', label: 'E-doręczenia' },
] as const;

function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+') ? digits : `+48${digits}`;
  return `tel:${normalized}`;
}

export default function Contact() {
  const { data, isLoading } = useContactInfo();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Nie udało się skopiować wartości', e);
    }
  };

  return (
    <>
      <Seo
        title="Kontakt | Fundacja „Zapłon”"
        description="Skontaktuj się z Fundacją „Zapłon”. Dane adresowe, telefon, e-mail, numer konta oraz formularz kontaktowy."
      />

      <Page
        eyebrow="Napisz do nas"
        title="Kontakt"
        lead="Masz pomysł, pytanie albo potrzebujesz wsparcia? Odezwij się."
        illustration="koperta"
      >
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Reveal direction="left">
            <ContactForm />
          </Reveal>

          <Reveal direction="right" delay={120}>
            <section aria-labelledby="contact-data" className="card p-6 md:p-8">
              <h2 id="contact-data" className="font-heading text-2xl font-semibold">
                Fundacja „Zapłon”
              </h2>

              {isLoading && <Loader />}

              {data && (
                <dl className="mt-6 space-y-5">
                  {data.address && (
                    <div>
                      <dt className="muted text-xs tracking-wide uppercase">Adres</dt>
                      <dd className="mt-1 text-lg">{data.address}</dd>
                    </div>
                  )}

                  {COPYABLE.map(({ key, label }) => {
                    const value = data[key];
                    if (!value) return null;

                    return (
                      <div key={key}>
                        <dt className="muted text-xs tracking-wide uppercase">{label}</dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-2 text-lg">
                          <span className="break-all">{value}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(key, value)}
                            className="btn btn-ghost px-2 py-1"
                            aria-label={`Skopiuj: ${label}`}
                          >
                            {copied === key ? (
                              <FiCheck
                                aria-hidden="true"
                                className="size-4 text-success"
                              />
                            ) : (
                              <FiCopy aria-hidden="true" className="size-4" />
                            )}
                          </button>
                        </dd>
                      </div>
                    );
                  })}

                  {data.phone && (
                    <div>
                      <dt className="muted text-xs tracking-wide uppercase">Telefon</dt>
                      <dd className="mt-1 text-lg">
                        <a href={toTelHref(data.phone)} className="link-quiet">
                          {data.phone}
                        </a>
                      </dd>
                    </div>
                  )}

                  {data.email && (
                    <div>
                      <dt className="muted text-xs tracking-wide uppercase">E-mail</dt>
                      <dd className="mt-1 text-lg">
                        <a href={`mailto:${data.email}`} className="link-quiet break-all">
                          {data.email}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              <span role="status" aria-live="polite" className="sr-only">
                {copied ? 'Skopiowano do schowka' : ''}
              </span>
            </section>
          </Reveal>
        </div>
      </Page>
    </>
  );
}
