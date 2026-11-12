import { useState } from 'react';
import { FiLink } from 'react-icons/fi';
import { supabase } from '../../../lib/supabase';
import { listMaterials, type Material } from '../../../lib/materials';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getErrorMessage } from '../../../lib/utils/errors';
import { useConfirm, useToast } from '../../../components/ui/Feedback';

type MaterialForm = Omit<Material, 'id' | 'created_at'>;

const EMPTY_FORM: MaterialForm = { title: '', description: '', file_url: '', cover_image: '', format: 'PDF' };

export default function MaterialsAdmin() {
  const { data: materials, error: listError, reload: fetchMaterials } = useAsyncData(listMaterials, [] as Material[], 'Nie udało się wczytać materiałów.');
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const showToast = useToast();

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
      <h1 className="text-2xl font-bold mb-6 text-ink">Materiały do pobrania</h1>

      {listError && <p role="alert" className="field-error mb-4">{listError}</p>}

      <div className="bg-surface-raised p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">Dodaj nowy materiał</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            placeholder="Tytuł"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-plain"
          />
          <input
            placeholder="Format (np. PDF, PPTX)"
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
            className="input-plain"
          />
          <textarea
            placeholder="Opis"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-plain md:col-span-2"
          />
          <input
            required
            type="url"
            placeholder="Link do pliku (URL)"
            value={form.file_url}
            onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            className="input-plain"
          />
          <input
            type="url"
            placeholder="Link do miniatury (URL)"
            value={form.cover_image}
            onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
            className="input-plain"
          />

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Dodawanie…' : 'Dodaj materiał'}
            </button>
            <p className="text-xs text-ink-muted mt-2">
              Po dodaniu materiału, użytkownicy po pobraniu automatycznie otrzymają e-mail z wybranym linkiem (dzięki globalnej automatyzacji MailerLite).
            </p>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {materials.map((mat) => (
          <div key={mat.id} className="bg-surface-raised p-4 rounded shadow-sm flex justify-between items-center">
            <div className="pr-4">
              <h3 className="font-bold">
                {mat.title} <span className="text-sm font-normal text-ink-muted">({mat.format})</span>
              </h3>
              <p className="text-sm text-danger truncate max-w-[250px] sm:max-w-md lg:max-w-xl" title={mat.file_url}>
                <FiLink aria-hidden="true" className="mr-1 inline size-3.5" />
                {mat.file_url}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(mat.id)}
              className="btn btn-danger whitespace-nowrap"
            >
              Usuń
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
