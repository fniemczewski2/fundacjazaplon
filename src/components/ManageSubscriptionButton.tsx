import { useState } from 'react';
import { Link } from 'wouter';
import { openPortal } from '../lib/finance';
import { getErrorMessage } from '../lib/utils/errors';

export default function ManageSubscriptionButton({ sessionId }: Readonly<{ sessionId: string }>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const open = async () => {
    setLoading(true);
    setError('');
    try {
      globalThis.location.href = await openPortal(sessionId);
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się otworzyć panelu wpłaty.'));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={open}
        disabled={loading}
        aria-busy={loading}
        className="btn btn-secondary"
      >
        {loading ? 'Otwieranie…' : 'Zarządzaj wpłatą cykliczną'}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}{' '}
          <Link to="/subskrypcja" className="underline">
            Strona wpłaty cyklicznej
          </Link>
        </p>
      )}
    </div>
  );
}
