import { useState } from 'react';
import { checkInstagramConnection, type InstagramConnectionStatus } from '../../lib/instagram';
import { getErrorMessage } from '../../lib/utils/errors';

/** Diagnostyka połączenia z Instagramem (Meta Graph API): odpytuje API na żywo, bez cache. */
export default function InstagramCheck() {
  const [result, setResult] = useState<InstagramConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await checkInstagramConnection());
    } catch (e) {
      setResult(null);
      setError(getErrorMessage(e, 'Nie udało się sprawdzić połączenia.'));
    } finally {
      setLoading(false);
    }
  };

  const summary = () => {
    if (!result) return null;
    if (!result.configured)
      return `Brak konfiguracji. Ustaw zmienne środowiskowe: ${result.missing.join(', ')}.`;
    if (result.ok) return `Połączenie działa. Liczba pobranych postów: ${result.postCount ?? 0}.`;
    return `Błąd połączenia${result.status ? ` (HTTP ${result.status})` : ''}: ${result.error ?? 'nieznany'}.`;
  };

  return (
    <section className="space-y-2 border-t pt-4" aria-labelledby="ig-check-title">
      <h2 id="ig-check-title" className="text-lg font-medium">
        Posty z Instagrama
      </h2>
      <p className="text-sm text-ink-muted">
        Sekcja na stronie głównej pobiera ostatnie posty przez Meta Graph API (odświeżanie co 15
        minut). Sprawdź, czy token jest ważny.
      </p>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => void run()}
        disabled={loading}
      >
        {loading ? 'Sprawdzanie…' : 'Sprawdź połączenie'}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className={result.ok ? 'text-sm text-ink' : 'field-error'} role="status">
          {summary()}
        </p>
      )}
    </section>
  );
}
