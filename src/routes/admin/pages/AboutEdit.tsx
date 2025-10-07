// src/routes/admin/pages/AboutEdit.tsx
import { useEffect, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAbout, getPillars, upsertAbout, savePillarsBatch } from '../../../lib/about';
import Loader from '../../../components/Loader';

type PillarModel = { id?: string; order_index: number; title: string; body_md: string };
const emptyPillar = (i: number): PillarModel => ({ order_index: i, title: '', body_md: '' });

/** STABILNY komponent – poza AboutEdit, memo dla mikro-optymalizacji */
const PillarEditor = memo(function PillarEditor({
  m,
  onChange,
}: {
  m: PillarModel;
  onChange: (p: PillarModel) => void;
}) {
  return (
    <div className="border rounded-2xl p-4">
      <div className="text-sm text-text-black/70 mb-1">Filar {m.order_index}</div>
      <input
        className="border p-2 rounded w-full mb-2"
        placeholder={`Tytuł filaru ${m.order_index}`}
        value={m.title}
        onChange={(e) => onChange({ ...m, title: e.target.value })}
      />
      <textarea
        className="border p-2 rounded w-full font-mono"
        rows={6}
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
          };
        });
        setPillars(mapped);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const a = await upsertAbout(description, aboutId);
      setAboutId(a.id);
      await savePillarsBatch(pillars);
      setOk('Zapisano.');
    } catch (e: any) {
      setErr(e?.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">O nas</h1>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {ok && <div className="text-sm text-green-600">{ok}</div>}

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm text-text-black/70 mb-2">Opis (Markdown)</div>
          <textarea
            className="border p-2 rounded w-full font-mono"
            rows={12}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm text-text-black/70 mb-2">Podgląd</div>
          <div className="prose max-w-none border rounded-2xl p-4">
            <ReactMarkdown>{description || '_Brak treści_'}</ReactMarkdown>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">5 filarów działalności</h2>
        <div className="grid gap-4 md:grid-cols-2">
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

      <button
        onClick={save}
        disabled={saving}
        className={`px-3 py-2 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-black'}`}
      >
        {saving ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </div>
  );
}
