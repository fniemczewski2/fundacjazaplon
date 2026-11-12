import { useEffect, useState } from 'react';
import { getJoinLink, upsertJoinLink, type JoinUs } from '../../../lib/join';
import { getErrorMessage } from '../../../lib/utils/errors';
import Loader from '../../../components/Loader';

const EMPTY_LINK: JoinUs = { id: '', survey_url: '' };

export default function JoinUsEdit() {
  const [link, setLink] = useState<JoinUs>(EMPTY_LINK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getJoinLink();
      setLink(data ?? EMPTY_LINK);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await upsertJoinLink(link);
      setMsg('Zapisano.');
    } catch (e) {
      setMsg(getErrorMessage(e, 'Błąd zapisu.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Ustawienia: Dołącz do nas</h1>
      {msg && (
        <div className="text-sm" role="status" aria-live="polite">
          {msg}
        </div>
      )}

      <label className="block">
        <span className="text-sm text-ink-muted">Link do ankiety</span>
        <input
          className="border p-2 rounded w-full"
          type="url"
          placeholder="https://formularz..."
          value={link.survey_url ?? ''}
          onChange={(e) => setLink((s) => ({ ...s, survey_url: e.target.value }))}
        />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn btn-primary"
      >
        {saving ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </div>
  );
}
