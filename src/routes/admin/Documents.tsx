// src/routes/admin/Documents.tsx
import { useEffect, useState } from 'react';
import { ALL_CATEGORIES, type DocCategory, listDocuments, uploadDocument, deleteDocument } from '../../lib/documents';
import { FiTrash2, FiUpload } from 'react-icons/fi';
import Loader from '../../components/Loader';

export default function AdminDocuments() {
  const [category, setCategory] = useState<DocCategory>('statut');
  const [files, setFiles] = useState<Array<{ name: string; path: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async (cat: DocCategory) => {
    setLoading(true);
    const data = await listDocuments(cat);
    setFiles(data);
    setLoading(false);
  };

  useEffect(() => { refresh(category); }, [category]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMsg(null);
    try {
      await uploadDocument(category, file);
      await refresh(category);
      setMsg('Plik przesłany.');
    } catch (e: any) {
      setMsg(e.message ?? 'Błąd przesyłania.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const onDelete = async (path: string) => {
    if (!confirm('Na pewno usunąć plik?')) return;
    setBusy(true); setMsg(null);
    try {
      await deleteDocument(path);
      await refresh(category);
      setMsg('Plik usunięty.');
    } catch (e: any) {
      setMsg(e.message ?? 'Błąd usuwania.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dokumenty</h1>

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DocCategory)}
          className="border p-2 rounded"
        >
          {ALL_CATEGORIES.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer">
          <FiUpload />
          <span>Dodaj plik</span>
          <input type="file" className="hidden" onChange={onUpload}
            accept=".pdf,.doc,.docx,.odt,.txt" disabled={busy} />
        </label>

        {msg && <span className="text-sm text-text-black/70">{msg}</span>}
      </div>

      {loading ? (
        <Loader />
      ) : files.length === 0 ? (
        <div className="text-text-black/70 text-sm">Brak plików w tej kategorii.</div>
      ) : (
        <ul className="divide-y border rounded-xl">
          {files.map((f) => (
            <li key={f.path} className="p-3 flex items-center justify-between">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[70%]">
                {f.name}
              </a>
              <button
                onClick={() => onDelete(f.path)}
                className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                disabled={busy}
              >
                <FiTrash2 />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
