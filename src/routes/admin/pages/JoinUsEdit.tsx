import { useEffect, useState } from 'react';
import { getJoinLink, upsertJoinLink, type JoinUs } from '../../../lib/join';

export default function JoinUsEdit() {
  const [link, setLink] = useState<JoinUs | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getJoinLink().then(data =>
      setLink(data ?? { id: '', survey_url: '' })
    );
  }, []);

  const save = async () => {
    if (!link) return;
    setSaving(true);
    setMsg(null);
    try {
      await upsertJoinLink(link);
      setMsg('Zapisano.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Ustawienia: Dołącz do nas</h1>
      {msg && <div className="text-sm text-green-600">{msg}</div>}

      <label className="block">
        <span className="text-sm text-text-black/70">Link do ankiety</span>
        <input
          className="border p-2 rounded w-full"
          type="url"
          placeholder="https://formularz..."
          value={link?.survey_url ?? ''}
          onChange={(e) => setLink(s => ({ ...s!, survey_url: e.target.value }))}
        />
      </label>

      <button
        onClick={save}
        disabled={saving}
        className={`px-4 py-2 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {saving ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </div>
  );
}
