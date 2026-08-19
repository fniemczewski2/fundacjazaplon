import { useEffect, useId, useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [origin, setOrigin] = useState('');

  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  useEffect(() => {
    setOrigin(globalThis.location.origin);
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get('sent') === '1') setSent(true);
  }, []);

  return (
    <div className="card p-6 md:p-8">
      <h2 className="font-heading text-2xl font-semibold">Napisz do nas</h2>
      <p className="lead mt-2 text-base">Odpisujemy zwykle w ciągu kilku dni roboczych.</p>

      {sent && (
        <p role="status" className="mt-5 rounded-xl border p-4 text-sm panel-warm">
          Dziękujemy! Twoja wiadomość została wysłana.
        </p>
      )}

      <form
        action="https://formsubmit.co/biuro@zaplon.org.pl"
        method="POST"
        className="mt-6 space-y-5"
      >
        <input type="hidden" name="_captcha" value="true" />
        <input type="hidden" name="_next" value={`${origin}/kontakt?sent=1`} />
        <input type="hidden" name="_subject" value="Nowa wiadomość z formularza kontaktowego" />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={nameId} className="field-label">
              Imię i nazwisko
            </label>
            <input
              id={nameId}
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Jan Kowalski"
              className="input-text"
            />
          </div>

          <div>
            <label htmlFor={emailId} className="field-label">
              Adres e-mail
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jan.kowalski@example.com"
              className="input-text"
            />
          </div>
        </div>

        <div>
          <label htmlFor={messageId} className="field-label">
            Wiadomość
          </label>
          <textarea
            id={messageId}
            name="message"
            rows={6}
            required
            placeholder="W czym możemy pomóc?"
            className="input-textarea"
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Wyślij wiadomość
          <FaPaperPlane aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
