import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type TeamMemberCreate,
} from '../../../lib/team';
import { uploadToMedia } from '../../../lib/media';
import { toSafeSlug } from '../../../lib/utils/text';
import { getErrorMessage } from '../../../lib/utils/errors';
import { useToast, useConfirm } from '../../../components/ui/Feedback';

type Model = Omit<TeamMemberCreate, 'photo_url'> & { id?: string; photo_url: string | null };

const EMPTY_MEMBER: Model = {
  name: '',
  role: null,
  order_index: 0,
  photo_url: null,
  bio_md: null,
  active: true,
  phone: null,
  email: null,
  slug: '',
};

export default function TeamEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const isNew = id === 'new';

  const [m, setM] = useState<Model>(EMPTY_MEMBER);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const data = await getTeamMember(id);
      if (data) setM(data);
    })();
  }, [id, isNew]);

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return m.photo_url ?? null;
  }, [file, m.photo_url]);

  useEffect(() => {
    return () => {
      if (previewUrl && file) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, file]);

  const handleSave = async () => {
    if (!m.name.trim()) {
      showToast('Podaj imię i nazwisko.', 'error');
      return;
    }

    try {
      setSaving(true);

      if (isNew) {
        const created = await createTeamMember({
          name: m.name,
          role: m.role || null,
          order_index: Number(m.order_index) || 0,
          bio_md: m.bio_md || null,
          active: !!m.active,
          phone: m.phone || null,
          email: m.email || null,
          slug: m.slug || '',
          photo_url: null,
        });

        if (file) {
          const url = await uploadToMedia(`team/${created.id}`, file);
          await updateTeamMember(created.id, { photo_url: url });
        }

        setLocation(`/admin/zespol/${created.id}`);
        return;
      }

      if (!id) return;

      let nextPhoto = m.photo_url ?? null;
      if (file) {
        nextPhoto = await uploadToMedia(`team/${id}`, file);
      }

      await updateTeamMember(id, {
        name: m.name,
        role: m.role || null,
        order_index: Number(m.order_index) || 0,
        bio_md: m.bio_md || null,
        active: !!m.active,
        photo_url: nextPhoto,
        phone: m.phone || null,
        email: m.email || null,
        slug: m.slug || '',
      });

      setLocation('/admin/zespol');
    } catch (e) {
      showToast(getErrorMessage(e, 'Błąd zapisu.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !id) return;
    const confirmed = await confirm('Na pewno usunąć tę osobę? Tej operacji nie można cofnąć.', {
      title: 'Usuń członka zespołu',
      confirmLabel: 'Usuń',
    });
    if (!confirmed) return;

    try {
      await deleteTeamMember(id);
      setLocation('/admin/zespol');
    } catch (e) {
      showToast(getErrorMessage(e, 'Błąd usuwania.'), 'error');
    }
  };

  return (
    <div className="p-6 space-y-3 max-w-3xl">
      <h1 className="text-2xl font-semibold">{isNew ? 'Nowa osoba' : 'Edytuj członka zespołu'}</h1>

      <div className="grid md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2 space-y-3">

          <input
            className="border p-2 rounded w-full"
            placeholder="Imię i nazwisko"
            value={m.name}
            onChange={(e) => {
              const val = e.target.value;
              setM((s) => ({
                ...s,
                name: val,
                slug: isNew ? toSafeSlug(val) : s.slug,
              }));
            }}
          />

          <input
            className="border p-2 rounded w-full"
            placeholder="Rola"
            value={m.role ?? ''}
            onChange={(e) => setM((s) => ({ ...s, role: e.target.value }))}
          />

          <input
            type="number"
            className="border p-2 rounded w-full"
            placeholder="Kolejność (0..n)"
            value={m.order_index}
            onChange={(e) => setM((s) => ({ ...s, order_index: Number(e.target.value) }))}
          />

          <input
            type="tel"
            value={m.phone ?? ''}
            onChange={(e) => setM((s) => ({ ...s, phone: e.target.value }))}
            className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded focus:ring-3 focus:ring-blue-200"
            placeholder="Nr telefonu: +48 123 456 789"
          />

          <input
            type="email"
            value={m.email ?? ''}
            onChange={(e) => setM((s) => ({ ...s, email: e.target.value }))}
            className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded focus:ring-3 focus:ring-blue-200"
            placeholder="Adres e-mail: jan.kowalski@zaplon.org.pl"
          />

          <input
            type="text"
            value={m.slug ?? ''}
            onChange={(e) => setM((s) => ({ ...s, slug: toSafeSlug(e.target.value) }))}
            className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded focus:ring-3 focus:ring-blue-200"
            placeholder="slug (np. jan-kowalski)"
            required
          />

          <textarea
            className="border p-2 rounded w-full font-mono"
            rows={12}
            placeholder="Bio (Markdown)"
            value={m.bio_md ?? ''}
            onChange={(e) => setM((s) => ({ ...s, bio_md: e.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={m.active}
              onChange={(e) => setM((s) => ({ ...s, active: e.target.checked }))}
            />
            Aktywny
          </label>
        </div>

        <div className="space-y-2">
          <div className="aspect-square rounded-xl border bg-gray-50 overflow-hidden flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-sm text-gray-500 p-4 text-center">Brak zdjęcia</div>
            )}
          </div>

          <label className="block">
            <span className="text-sm text-gray-500">Zdjęcie (JPG/PNG)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full"
            />
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-3 py-2 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-black'}`}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
        {!isNew && (
          <button onClick={handleDelete} className="px-3 py-2 rounded-xl border hover:bg-red-50 hover:text-red-600 transition-colors">
            Usuń
          </button>
        )}
      </div>
    </div>
  );
}