// src/routes/admin/team/TeamEdit.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type TeamMember,
  type TeamMemberCreate,
} from '../../../lib/team';
import { uploadToMedia } from '../../../lib/media';

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const empty: TeamMemberCreate & { phone?: string | null; email?: string | null; slug?: string } = {
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
  const nav = useNavigate();
  const isNew = id === 'new';

  const [m, setM] = useState<any>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const data = await getTeamMember(id!);
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
    if (!m.name?.trim()) {
      alert('Podaj imię i nazwisko.');
      return;
    }
    try {
      setSaving(true);

      if (isNew) {
        const created = await createTeamMember({ ...(m as TeamMemberCreate), photo_url: null });

        if (file) {
          const url = await uploadToMedia(`team/${created.id}`, file);
          await updateTeamMember(created.id, { photo_url: url });
        }

        nav(`/admin/zespol/${created.id}`, { replace: true });
        return;
      }

      let nextPhoto = m.photo_url ?? null;
      if (file && id) {
        nextPhoto = await uploadToMedia(`team/${id}`, file);
      }

      // Dodane nowe pola do aktualizacji
      await updateTeamMember((m as TeamMember).id ?? id!, {
        name: m.name,
        role: m.role ?? null,
        order_index: Number(m.order_index) || 0,
        bio_md: m.bio_md ?? null,
        active: !!m.active,
        photo_url: nextPhoto,
        phone: m.phone || null,
        email: m.email || null,
        slug: m.slug || '',
      } as TeamMember); 

      nav('/admin/zespol');
    } catch (e: any) {
      alert(e?.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;
    if (!confirm('Na pewno usunąć tę osobę?')) return;
    try {
      await deleteTeamMember(id!);
      nav('/admin/zespol', { replace: true });
    } catch (e: any) {
      alert(e?.message ?? 'Błąd usuwania.');
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
            value={m.name || ''}
            onChange={(e) => {
              const val = e.target.value;
              setM((s: any) => ({
                ...s,
                name: val,
                slug: isNew ? generateSlug(val) : s.slug,
              }));
            }}
          />
          
          <input
            className="border p-2 rounded w-full"
            placeholder="Rola"
            value={m.role || ''}
            onChange={(e) => setM((s: any) => ({ ...s, role: e.target.value }))}
          />
          
          <input
            type="number"
            className="border p-2 rounded w-full"
            placeholder="Kolejność (0..n)"
            value={m.order_index ?? 0}
            onChange={(e) => setM((s: any) => ({ ...s, order_index: Number(e.target.value) }))}
          />
          
          <input
            type="tel"
            value={m.phone || ''}
            onChange={(e) => setM((s: any) => ({ ...s, phone: e.target.value }))}
            className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
            placeholder="Nr telefonu: +48 123 456 789"
          />

          <input
            type="email"
            value={m.email || ''}
            onChange={(e) => setM((s: any) => ({ ...s, email: e.target.value }))}
            className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
            placeholder="Adres e-mail: jan.kowalski@zaplon.org.pl"
          />

          <input
            type="text"
            value={m.slug || ''}
            onChange={(e) => setM((s: any) => ({ ...s, slug: generateSlug(e.target.value) }))}
            className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
            placeholder="slug (np. jan-kowalski)"
            required
          />

          <textarea
            className="border p-2 rounded w-full font-mono"
            rows={12}
            placeholder="Bio (Markdown)"
            value={m.bio_md ?? ''}
            onChange={(e) => setM((s: any) => ({ ...s, bio_md: e.target.value }))}
          />
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!m.active}
              onChange={(e) => setM((s: any) => ({ ...s, active: e.target.checked }))}
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
              accept="image/*"
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