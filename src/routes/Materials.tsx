import React, { useEffect, useId, useState } from 'react';
import { FaDownload } from 'react-icons/fa6';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/utils/errors';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Reveal from '../components/Reveal';
import PrivacyPolicyLink from '../components/PrivacyPolicyLink';

interface Material {
  id: string;
  title: string;
  description: string;
  format: string;
  cover_image: string;
  file_url: string;
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Material | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const nameId = useId();
  const emailId = useId();

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (data) setMaterials(data);
      setLoadingList(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const openFor = (mat: Material) => {
    setSelected(mat);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          file_url: selected.file_url,
          file_title: selected.title,
        }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const data: { error?: string } | null = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(data?.error || 'Nie udało się wysłać pliku. Spróbuj ponownie.');
      }

      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(getErrorMessage(err));
    }
  };

  return (
    <>
      <Seo
        title="Materiały | Fundacja „Zapłon”"
        description="Pobierz bezpłatne materiały edukacyjne Fundacji „Zapłon” — poradniki dla osób działających społecznie."
      />

      <Page
        eyebrow="Do pobrania"
        title="Materiały"
        lead="Poradniki i szablony, które przydają się na starcie działania społecznego. Za darmo."
        illustration="notes"
      >
        {loadingList && <Loader />}

        {!loadingList && materials.length === 0 && (
          <p className="muted">Nie mamy jeszcze opublikowanych materiałów. Zajrzyj wkrótce.</p>
        )}

        {!loadingList && materials.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((mat, i) => (
              <Reveal as="li" key={mat.id} delay={(i % 3) * 110} className="h-full">
                <article className="card card-interactive flex h-full flex-col overflow-hidden p-0">
                  {mat.cover_image && (
                    <img
                      src={mat.cover_image}
                      alt=""
                      aria-hidden="true"
                      className="aspect-[16/9] w-full border-b object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="font-heading text-lg font-semibold">{mat.title}</h2>
                      {mat.format && <span className="badge shrink-0">{mat.format}</span>}
                    </div>

                    <p className="muted flex-1 text-sm leading-relaxed">{mat.description}</p>

                    <button
                      type="button"
                      onClick={() => openFor(mat)}
                      className="btn btn-secondary mt-6 w-full"
                    >
                      Pobierz
                      <FaDownload aria-hidden="true" />
                      <span className="sr-only">: {mat.title}</span>
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        )}
      </Page>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Pobierz: ${selected.title}` : ''}
      >
        {selected && status === 'success' ? (
          <div className="text-center">
            <p className="text-lg font-medium">Gotowe! Twój materiał czeka.</p>

            <a
              href={selected.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ember mt-6"
            >
              Pobierz plik
              <FaDownload aria-hidden="true" />
            </a>

            <p className="field-hint mt-6 leading-relaxed">
              Zapisaliśmy Cię też do newslettera. Kopię linku znajdziesz w skrzynce e-mail.
            </p>
          </div>
        ) : (
          <form onSubmit={handleDownload} className="space-y-5">
            <p className="muted text-sm leading-relaxed">
              Podaj adres e-mail, żebyśmy mogli wysłać plik. Przy okazji zapiszemy Cię do
              newslettera.
            </p>

            <div>
              <label htmlFor={nameId} className="field-label">
                Imię
              </label>
              <input
                id={nameId}
                type="text"
                required
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-text"
              />
            </div>

            <div>
              <label htmlFor={emailId} className="field-label">
                Adres e-mail
              </label>
              <input
                id={emailId}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-text"
              />
            </div>

            {status === 'error' && (
              <p role="alert" className="field-error">
                {errorMessage}
              </p>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn btn-ember w-full">
              {status === 'loading' ? (
                'Wysyłamy…'
              ) : (
                <>
                  Wyślij plik <FaDownload aria-hidden="true" />
                </>
              )}
            </button>

            <p className="field-hint text-center">
              Zapisując się, akceptujesz naszą <PrivacyPolicyLink black />
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}
