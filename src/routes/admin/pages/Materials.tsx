import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getErrorMessage } from '../../../lib/utils/errors';
import { useConfirm, useToast } from '../../../components/ui/Feedback';

type Material = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  cover_image: string;
  format: string;
  created_at: string;
};

type MaterialForm = Omit<Material, 'id' | 'created_at'>;

const EMPTY_FORM: MaterialForm = { title: '', description: '', file_url: '', cover_image: '', format: 'PDF' };

export default function MaterialsAdmin() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const showToast = useToast();

  const fetchMaterials = useCallback(async () => {
    const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast(getErrorMessage(error, 'Nie udało się wczytać materiałów.'), 'error');
      return;
    }
    setMaterials(data ?? []);
  }, [showToast]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('materials').insert([form]);
      if (error) throw error;
      await fetchMaterials();
      setForm(EMPTY_FORM);
      showToast('Materiał dodany.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Nie udało się dodać materiału.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('Na pewno usunąć ten materiał? Tej operacji nie można cofnąć.', {
      title: 'Usuń materiał',
      confirmLabel: 'Usuń',
    });
    if (!confirmed) return;

    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      showToast(getErrorMessage(error, 'Nie udało się usunąć materiału.'), 'error');
      return;
    }
    await fetchMaterials();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Zarządzanie Materiałami (Lead Magnets)</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">Dodaj nowy materiał</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            placeholder="Tytuł"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border border-gray-200 dark:border-gray-600 p-2 rounded w-full outline-hidden focus:border-brand"
          />
          <input
            placeholder="Format (np. PDF, PPTX)"
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
            className="border border-gray-200 dark:border-gray-600 p-2 rounded w-full outline-hidden focus:border-brand"
          />
          <textarea
            placeholder="Opis"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-gray-200 dark:border-gray-600 p-2 rounded w-full md:col-span-2 outline-hidden focus:border-brand"
          />
          <input
            required
            type="url"
            placeholder="Link do pliku (URL)"
            value={form.file_url}
            onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            className="border border-gray-200 dark:border-gray-600 p-2 rounded w-full outline-hidden focus:border-brand"
          />
          <input
            type="url"
            placeholder="Link do miniatury (URL)"
            value={form.cover_image}
            onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
            className="border border-gray-200 dark:border-gray-600 p-2 rounded w-full outline-hidden focus:border-brand"
          />

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-2 px-6 rounded transition-colors"
            >
              {saving ? 'Dodawanie…' : 'Dodaj materiał'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Po dodaniu materiału, użytkownicy po pobraniu automatycznie otrzymają e-mail z wybranym linkiem (dzięki globalnej automatyzacji MailerLite).
            </p>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {materials.map((mat) => (
          <div key={mat.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div className="pr-4">
              <h3 className="font-bold">
                {mat.title} <span className="text-sm font-normal text-gray-500">({mat.format})</span>
              </h3>
              <p className="text-sm text-brand dark:text-accent-orange truncate max-w-[250px] sm:max-w-md lg:max-w-xl" title={mat.file_url}>
                🔗 {mat.file_url}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(mat.id)}
              className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors whitespace-nowrap"
            >
              Usuń
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
