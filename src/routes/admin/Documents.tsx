// src/routes/admin/Documents.tsx
import { useCallback, useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  ALL_CATEGORIES,
  type DocCategory,
  type DocumentFile,
  listDocuments,
  uploadDocument,
  deleteDocument,
  DocumentValidationError,
} from '../../lib/documents';
import { getErrorMessage } from '../../lib/utils/errors';
import { useConfirm } from '../../components/ui/Feedback';
import { FiTrash2, FiUpload } from 'react-icons/fi';
import Loader from '../../components/Loader';

export default function AdminDocuments() {
  const [category, setCategory] = useState<DocCategory>('statut');
  const fetchFiles = useCallback(() => listDocuments(category), [category]);
  const { data: files, loading, reload } = useAsyncData(fetchFiles, [] as DocumentFile[], 'Nie udało się wczytać plików.');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const confirm = useConfirm();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMsg(null);
    try {
      await uploadDocument(category, file);
      await reload();
      setMsg('Plik przesłany.');
    } catch (err) {
      const message =
        err instanceof DocumentValidationError ? err.message : getErrorMessage(err, 'Błąd przesyłania.');
      setMsg(message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const onDelete = async (path: string) => {
    const confirmed = await confirm('Na pewno usunąć plik? Tej operacji nie można cofnąć.', {
      title: 'Usuń plik',
      confirmLabel: 'Usuń',
    });
    if (!confirmed) return;

    setBusy(true); setMsg(null);
    try {
      await deleteDocument(path);
      await reload();
      setMsg('Plik usunięty.');
    } catch (err) {
      setMsg(getErrorMessage(err, 'Błąd usuwania.'));
    } finally {
      setBusy(false);
    }
  };

  const renderFileList = () => {
    if (loading) return <Loader />;
    if (files.length === 0) {
      return <div className="text-ink-muted text-sm">Brak plików w tej kategorii.</div>;
    }
    return (
      <ul className="divide-y border rounded-xl">
        {files.map((f) => (
          <li key={f.path} className="p-3 flex items-center justify-between">
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[70%]">
              {f.name}
            </a>
            <button
              type="button"
              onClick={() => onDelete(f.path)}
              className="btn btn-secondary"
              disabled={busy}
            >
              <FiTrash2 />
            </button>
          </li>
        ))}
      </ul>
    );
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

        {msg && <span className="text-sm text-ink-muted">{msg}</span>}
      </div>

      {renderFileList()}
    </div>
  );
}
