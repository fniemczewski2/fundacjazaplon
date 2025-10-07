import { useEffect, useState } from 'react';
import { getSocialLinks, upsertSocialLinks, type SocialLinks } from '../../../lib/social';
import Loader from '../../../components/Loader';

export default function SocialEdit() {
  const [links, setLinks] = useState<SocialLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getSocialLinks();
      setLinks(data ?? { facebook: '', instagram: '', twitter: '' } as SocialLinks);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!links) return;
    setSaving(true);
    setMsg(null);
    try {
      await upsertSocialLinks(links);
      setMsg('Zapisano.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />

  return (
    <div className="p-6 space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Linki społecznościowe</h1>
      {msg && <div className="text-sm">{msg}</div>}

      <input
        className="border p-2 rounded w-full"
        placeholder="Facebook URL"
        value={links?.facebook ?? ''}
        onChange={(e) => setLinks(s => ({ ...s!, facebook: e.target.value }))}
      />
      <input
        className="border p-2 rounded w-full"
        placeholder="Instagram URL"
        value={links?.instagram ?? ''}
        onChange={(e) => setLinks(s => ({ ...s!, instagram: e.target.value }))}
      />
      <input
        className="border p-2 rounded w-full"
        placeholder="Twitter/X URL"
        value={links?.twitter ?? ''}
        onChange={(e) => setLinks(s => ({ ...s!, twitter: e.target.value }))}
      />

      <button
        onClick={save}
        disabled={saving}
        className={`px-4 py-2 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-black'}`}
      >
        {saving ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </div>
  );
}
