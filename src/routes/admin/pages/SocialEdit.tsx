import { useEffect, useState } from 'react';
import { getSocialLinks, upsertSocialLinks, type SocialLinks } from '../../../lib/social';
import { getErrorMessage } from '../../../lib/utils/errors';
import Loader from '../../../components/Loader';

const EMPTY_LINKS: SocialLinks = {
  id: '',
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
};

function isValidHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const FIELDS: Array<{ key: keyof Omit<SocialLinks, 'id'>; label: string }> = [
  { key: 'facebook', label: 'Facebook URL' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'twitter', label: 'Twitter/X URL' },
  { key: 'linkedin', label: 'LinkedIn URL' },
];

export default function SocialEdit() {
  const [links, setLinks] = useState<SocialLinks>(EMPTY_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getSocialLinks();
      setLinks(data ?? EMPTY_LINKS);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setMsg(null);

    // Każde niepuste pole musi być poprawnym adresem http(s) — te wartości trafiają
    // później bezpośrednio jako `href` na publiczną stopkę i stronę /links.
    for (const { key, label } of FIELDS) {
      const value = links[key];
      if (value && !isValidHttpUrl(value)) {
        setMsg(`Nieprawidłowy adres URL w polu „${label}”. Podaj pełny link zaczynający się od http:// lub https://`);
        return;
      }
    }

    setSaving(true);
    try {
      await upsertSocialLinks(links);
      setMsg('Zapisano.');
    } catch (e) {
      setMsg(getErrorMessage(e, 'Nie udało się zapisać.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Linki społecznościowe</h1>
      {msg && (
        <div className="text-sm" role="status" aria-live="polite">
          {msg}
        </div>
      )}

      {FIELDS.map(({ key, label }) => (
        <input
          key={key}
          className="border p-2 rounded w-full"
          placeholder={label}
          type="url"
          value={links[key] ?? ''}
          onChange={(e) => setLinks((s) => ({ ...s, [key]: e.target.value }))}
        />
      ))}

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
