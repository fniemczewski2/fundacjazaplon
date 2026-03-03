// src/routes/admin/pages/AboutEdit.tsx
import { useEffect, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAbout, getPillars, upsertAbout, savePillarsBatch } from '../../../lib/about';
import Loader from '../../../components/Loader';
import { supabase } from '../../../lib/supabase'; // <-- WAŻNE: Dodany import Supabase

// Zaktualizowany model o pole image_url
type PillarModel = { id?: string; order_index: number; title: string; body_md: string; image_url: string };
const emptyPillar = (i: number): PillarModel => ({ order_index: i, title: '', body_md: '', image_url: '' });

/** STABILNY komponent – poza AboutEdit, memo dla mikro-optymalizacji */
const PillarEditor = memo(function PillarEditor({
  m,
  onChange,
}: {
  m: PillarModel;
  onChange: (p: PillarModel) => void;
}) {
  const [uploading, setUploading] = useState(false);

  // Funkcja wgrywająca obrazek do Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `pillars/${fileName}`;

      // Zmień 'media' na nazwę Twojego bucketa, jeśli jest inna (np. 'images')
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('media').getPublicUrl(filePath);
      onChange({ ...m, image_url: data.publicUrl });
    } catch (err: any) {
      alert(`Błąd wgrywania: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-2xl p-4 bg-white dark:bg-gray-800">
      <div className="text-sm text-text-black/70 dark:text-gray-300 font-bold mb-3">Filar {m.order_index}</div>
      
      {/* Sekcja Obrazka */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Obrazek / Ikona</label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="border p-2 rounded flex-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            placeholder="URL obrazka..."
            value={m.image_url}
            onChange={(e) => onChange({ ...m, image_url: e.target.value })}
          />
          <label className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-2 rounded cursor-pointer text-sm transition-colors">
            {uploading ? 'Wgrywam...' : 'Wgraj'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
        {m.image_url && (
          <img src={m.image_url} alt="Podgląd" className="h-16 w-auto mt-2 rounded object-contain bg-gray-50 dark:bg-gray-900 p-1" />
        )}
      </div>

      <input
        className="border p-2 rounded w-full mb-3 dark:bg-gray-700 dark:border-gray-600"
        placeholder={`Tytuł filaru ${m.order_index}`}
        value={m.title}
        onChange={(e) => onChange({ ...m, title: e.target.value })}
      />
      <textarea
        className="border p-2 rounded w-full font-mono text-sm dark:bg-gray-700 dark:border-gray-600"
        rows={5}
        placeholder="Opis (Markdown)"
        value={m.body_md}
        onChange={(e) => onChange({ ...m, body_md: e.target.value })}
      />
    </div>
  );
});

export default function AboutEdit() {
  const [aboutId, setAboutId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [pillars, setPillars] = useState<PillarModel[]>([1, 2, 3, 4, 5].map(emptyPillar));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      const [a, p] = await Promise.all([getAbout(), getPillars()]);
      if (!alive) return;

      if (a) {
        setAboutId(a.id);
        setDescription(a.description_md ?? '');
      }
      if (p && p.length) {
        const mapped: PillarModel[] = [1, 2, 3, 4, 5].map((i) => {
          const found = p.find((x) => x.order_index === i);
          return {
            id: found?.id,
            order_index: i,
            title: found?.title ?? '',
            body_md: found?.body_md ?? '',
            image_url: found?.image_url ?? '', // <-- POBRANIE URL Z BAZY
          };
        });
        setPillars(mapped);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const a = await upsertAbout(description, aboutId);
      setAboutId(a.id);
      await savePillarsBatch(pillars);
      setOk('Zapisano pomyślnie!');
      setTimeout(() => setOk(null), 3000);
    } catch (e: any) {
      setErr(e?.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edycja: O nas</h1>
        <button
          onClick={save}
          disabled={saving}
          className={`px-6 py-2 rounded-xl text-white font-medium transition-all ${saving ? 'bg-gray-400' : 'bg-brand hover:opacity-90'}`}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
      </div>

      {err && <div className="p-4 bg-red-100 text-red-700 rounded-xl">{err}</div>}
      {ok && <div className="p-4 bg-green-100 text-green-700 rounded-xl">{ok}</div>}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-2">Główny opis (Markdown)</label>
          <textarea
            className="border p-4 rounded-xl w-full font-mono flex-1 min-h-[300px] dark:bg-gray-800 dark:border-gray-700"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-2">Podgląd na żywo</label>
          <div className="prose max-w-none border rounded-xl p-6 flex-1 bg-white dark:bg-gray-800 dark:border-gray-700 overflow-y-auto max-h-[500px]">
            <ReactMarkdown>{description || '_Brak treści_'}</ReactMarkdown>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">5 filarów działalności</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((m, idx) => (
            <PillarEditor
              key={`pillar-${m.order_index}`} 
              m={m}
              onChange={(pm) =>
                setPillars((prev) => {
                  const next = [...prev];
                  next[idx] = pm;
                  return next;
                })
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}