import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadToMedia, MediaValidationError } from '../../lib/media';
import { getErrorMessage } from '../../lib/utils/errors';
import { useToast } from '../../components/ui/Feedback';

type FileRow = { name: string; url: string };

export default function Media() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const showToast = useToast();

  const list = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from('media')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      showToast(getErrorMessage(error, 'Nie udało się wczytać listy plików.'), 'error');
      setLoading(false);
      return;
    }

    // getPublicUrl jest operacją synchroniczną (samo budowanie URL-a, bez sieci),
    // więc nie ma potrzeby owijać jej w Promise.all/async.
    const rows: FileRow[] = (data ?? []).map((f) => ({
      name: f.name,
      url: supabase.storage.from('media').getPublicUrl(f.name).data.publicUrl,
    }));
    setFiles(rows);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    list();
  }, [list]);

  const onChoose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // pozwala ponownie wybrać ten sam plik po błędzie
    if (!file) return;

    setUploading(true);
    try {
      // uploadToMedia sanityzuje nazwę pliku ORAZ waliduje typ/rozmiar —
      // wcześniej ten panel wgrywał `file.name` bezpośrednio, z pominięciem
      // obu tych zabezpieczeń.
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

      {loading ? (
        <p className="text-text-black/70">Ładowanie…</p>
      ) : files.length === 0 ? (
        <p className="text-text-black/70">Brak wgranych plików.</p>
      ) : (
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
      )}
    </div>
  );
}
