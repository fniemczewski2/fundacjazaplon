import { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import PrivacyPolicyLink from './PrivacyPolicyLink';

export default function NewsletterCard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // NAPRAWA: Dodano zmienną name do wysyłanego payloadu
        body: JSON.stringify({ name, email }), 
      });

      // NAPRAWA: Bezpieczne parsowanie odpowiedzi, aby uniknąć błędu "Unexpected end of JSON input"
      const contentType = res.headers.get("content-type");
      let data = null;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data?.error || `Wystąpił błąd serwera (${res.status}). Spróbuj ponownie.`);
      }

      setStatus('success');
      setName(''); // NAPRAWA: Czyszczenie pola imię po sukcesie
      setEmail('');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="card p-8 text-center">
      <h2 className="section-title">Newsletter</h2>
      <p className="mt-5 mb-6 text-text-black/80">
        Chcesz być na&nbsp;bieżąco z&nbsp;naszymi działaniami? Zapisz&nbsp;się, aby otrzymywać informacje o&nbsp;realizowanych przez nas projektach.
      </p>

      {status === 'success' ? (
        <div className="text-brand dark:text-accent-orange p-4 rounded-lg inline-block font-medium">
          Dziękujemy! Sprawdź swoją skrzynkę e-mail.
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row w-full gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Twoje imię"
              required
              className="input-text"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Twój adres e-mail"
              required
              className="input-text"
            />
            </div>
          <div className="flex items-center">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn btn-secondary inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
            >
              {status === 'loading' ? 'Zapisywanie...' : (
                <>
                  Zapisz się <FaPaperPlane />
                </>
              )}
            </button>
          </div>
          
          {status === 'error' && (
             <p className="text-text-black text-sm font-medium w-full text-left sm:text-center mt-1">
               Wystąpił błąd: {errorMessage}
             </p>
          )}
        </form>
      )}

      <div className="text-xs text-text-black/80 mt-6 max-w-lg mx-auto leading-relaxed">
        Zapisując się wyrażam zgodę na przetwarzanie danych w&nbsp;celach marketingowych. 
        Szczegóły: <PrivacyPolicyLink black />
        </div>
    </div>
  );
}