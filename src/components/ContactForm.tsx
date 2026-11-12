import { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import Field from './ui/Field';
import Turnstile from './Turnstile';
import PrivacyPolicyLink from './PrivacyPolicyLink';
import { postJson } from '../lib/api';
import { getErrorMessage } from '../lib/utils/errors';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await postJson('/api/contact', { name, email, message, website: honeypot, captchaToken }, 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    } finally {
      setCaptchaReset((n) => n + 1);
    }
  };

  return (
    <div className="card p-6 md:p-8">
      <h2 className="font-heading text-2xl font-semibold">Napisz do nas</h2>
      <p className="lead mt-2 text-base">Odpisujemy zwykle w ciągu kilku dni roboczych.</p>

      {status === 'success' && (
        <output className="mt-5 block rounded-xl border p-4 text-sm panel-warm">
          Dziękujemy! Twoja wiadomość została wysłana.
        </output>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Imię i nazwisko">
            {(a11y) => (
              <input {...a11y} type="text" required maxLength={200} autoComplete="name" placeholder="Jan Kowalski" value={name} onChange={(e) => setName(e.target.value)} className="input-text" />
            )}
          </Field>

          <Field label="Adres e-mail">
            {(a11y) => (
              <input {...a11y} type="email" required autoComplete="email" placeholder="jan.kowalski@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-text" />
            )}
          </Field>
        </div>

        <Field label="Wiadomość">
          {(a11y) => (
            <textarea {...a11y} rows={6} required minLength={5} maxLength={5000} placeholder="W czym możemy pomóc?" value={message} onChange={(e) => setMessage(e.target.value)} className="input-textarea" />
          )}
        </Field>

        {/* Pole-pułapka dla botów: ukryte przed osobami i czytnikami ekranu. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Nie wypełniaj tego pola
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
        </div>

        <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />

        {status === 'error' && (
          <p role="alert" className="field-error">
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={status === 'loading'} className="btn btn-primary">
          {status === 'loading' ? (
            'Wysyłamy…'
          ) : (
            <>
              Wyślij wiadomość
              <FaPaperPlane aria-hidden="true" />
            </>
          )}
        </button>

        <p className="field-hint">
          Wysyłając wiadomość, akceptujesz zasady z <PrivacyPolicyLink black />.
        </p>
      </form>
    </div>
  );
}
