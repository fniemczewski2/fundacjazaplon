import { useState } from 'react';
import { adminAction } from '../../lib/agreements';
import { getErrorMessage } from '../../lib/utils/errors';
import CopyButton from './CopyButton';

/**
 * PESEL jest w bazie zaszyfrowany. Odsłonięcie wymaga osobnego żądania do serwera, które zostawia ślad w dzienniku zdarzeń umowy.
 * Numer znika z widoku po ponownym kliknięciu i nie jest nigdzie zapisywany po stronie przeglądarki.
 */
export default function PeselReveal({ agreementId, label }: Readonly<{ agreementId: string; label: string }>) {
  const [pesel, setPesel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reveal = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await adminAction(agreementId, 'reveal-pesel');
      setPesel(result.pesel ?? null);
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się odczytać numeru.'));
    } finally {
      setBusy(false);
    }
  };

  if (pesel) {
    return (
      <span className="inline-flex items-center gap-1 font-mono">
        {pesel}
        <CopyButton value={pesel} label={`PESEL, ${label}`} />
        <button type="button" onClick={() => setPesel(null)} className="link-quiet ml-1 font-sans text-xs underline">
          Ukryj
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={reveal} disabled={busy} className="btn btn-secondary px-3 py-1 text-xs">
        {busy ? 'Pobieranie…' : 'Pokaż PESEL'}
        <span className="sr-only">: {label}</span>
      </button>
      {error && <span role="alert" className="field-error text-xs">{error}</span>}
    </span>
  );
}
