import { useState } from 'react';
import { listMediaFiles, uploadToMedia, MediaValidationError, type MediaFile } from '../../lib/media';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/utils/errors';
import { useToast } from '../../components/ui/Feedback';

export default function Media() {
  const { data: files, loading, error, reload: list } = useAsyncData(listMediaFiles, [] as MediaFile[], 'Nie udało się wczytać listy plików.');
  const [uploading, setUploading] = useState(false);
  const showToast = useToast();

  const onChoose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // pozwala ponownie wybrać ten sam plik po błędzie
    if (!file) return;

    setUploading(true);
    try {
      // uploadToMedia sanityzuje nazwę pliku i waliduje typ oraz rozmiar.
      await uploadToMedia('', file);
      await list();
      showToast('Plik został wgrany.', 'success');
    } catch (err) {
      const message =
        err instanceof MediaValidationError ? err.message : getErrorMessage(err, 'Nie udało się wgrać pliku.');
      showToast(message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media</h1>
        <label className="btn btn-primary cursor-pointer">
          {uploading ? 'Wgrywanie…' : 'Wgraj plik'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onChoose}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>

      {renderFiles()}
    </div>
  );

  function renderFiles() {
    if (loading) return <p className="text-ink-muted">Ładowanie…</p>;
    if (error) return <p role="alert" className="field-error">{error}</p>;
    if (files.length === 0) return <p className="text-ink-muted">Brak wgranych plików.</p>;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.map((f) => (
          <a
            key={f.name}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border rounded-xl overflow-hidden"
          >
            <img src={f.url} alt={f.name} className="w-full aspect-square object-cover" loading="lazy" />
            <div className="p-2 text-sm truncate">{f.name}</div>
          </a>
        ))}
      </div>
    );
  }
}
