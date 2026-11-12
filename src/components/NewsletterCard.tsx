import { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import PrivacyPolicyLink from './PrivacyPolicyLink';
import Illustration from './Illustration';
import Field from './ui/Field';
import Turnstile from './Turnstile';
import { postJson } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { getErrorMessage } from '../lib/utils/errors';

export default function NewsletterCard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await postJson('/api/subscribe-newsletter', { name, email, captchaToken }, 'Nie udało się zapisać na newsletter. Spróbuj ponownie.');
      trackEvent('newsletter_signup');
      setStatus('success');
      setName('');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    } finally {
      setCaptchaReset((n) => n + 1);
    }
  };

  return (
    <div className="card relative overflow-hidden p-6 md:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 -left-8 w-40 opacity-10 md:w-52"
      >
        <Illustration name="koperta" />
      </div>

      <div className="relative mx-auto max-w-lg text-center">
        <p className="eyebrow mb-4 justify-center">Newsletter</p>
        <h2 className="section-title">Bądź na bieżąco</h2>
        <p className="lead mt-4">
          Raz na jakiś czas piszemy o tym, co robimy i&nbsp;gdzie można się przyłączyć. Bez spamu.
        </p>

        {status === 'success' ? (
          <output className="mt-8 block rounded-2xl border p-5 font-medium panel-warm">
            Dziękujemy! Sprawdź skrzynkę, wysłaliśmy wiadomość potwierdzającą.
          </output>
        ) : (
          <form onSubmit={handleSubscribe} className="mt-8 space-y-4 text-left">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Imię">
                {(a11y) => (
                  <input {...a11y} type="text" required autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className="input-text" />
                )}
              </Field>

              <Field label="Adres e-mail">
                {(a11y) => (
                  <input {...a11y} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-text" />
                )}
              </Field>
            </div>

            <div className="flex justify-center">
              <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
            </div>

            <div className="flex justify-center pt-1">
              <button type="submit" disabled={status === 'loading'} className="btn btn-ember">
                {status === 'loading' ? (
                  'Zapisujemy…'
                ) : (
                  <>
                    Zapisz się <FaPaperPlane aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            {status === 'error' && (
              <p role="alert" className="field-error text-center">
                {errorMessage}
              </p>
            )}
          </form>
        )}

        <p className="field-hint mt-6 leading-relaxed">
          Zapisując się, zgadzasz się na przetwarzanie danych w&nbsp;celach marketingowych.
          Szczegóły: <PrivacyPolicyLink black />
        </p>
      </div>
    </div>
  );
}
