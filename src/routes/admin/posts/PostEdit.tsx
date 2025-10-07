// src/routes/admin/posts/PostEdit.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPostById,
  createPost,
  updatePost,
  deletePost as removePost,
  uploadPostCover,
  slugify,
  type Post,
  type PostCreate,
} from '../../../lib/post';

type Model = {
  title: string;
  slug: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  published_at: string | null;
};

const empty: Model = {
  title: '',
  slug: '',
  excerpt: null,
  body_md: '',
  cover_url: null,
  published_at: null,
};

export default function PostEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === 'new';

  const [m, setM] = useState<Model>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const data = await getPostById(id!);
      if (data) {
        setM({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          body_md: data.body_md,
          cover_url: data.cover_url,
          published_at: data.published_at,
        });
      }
    })();
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew) return;
    if (!m.slug && m.title) {
      setM((s) => ({ ...s, slug: slugify(m.title) }));
    }
  }, [m.title, m.slug, isNew]);

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return m.cover_url ?? null;
  }, [file, m.cover_url]);

  useEffect(() => {
    return () => {
      if (previewUrl && file) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, file]);

  const save = async (publish = false) => {
    if (!m.title.trim()) {
      alert('Podaj tytuł.');
      return;
    }
    if (!m.slug.trim()) {
      alert('Podaj slug.');
      return;
    }

    try {
      setSaving(true);

      const payload: PostCreate = {
        ...m,
        published_at: publish ? new Date().toISOString() : m.published_at,
      };

      if (isNew) {
        const created = await createPost({ ...payload, cover_url: null });

        if (file) {
          await uploadPostCover(created.id, file);
        }

        return nav(`/admin/aktualnosci/${created.id}`, { replace: true });
      } else {
        await updatePost(id!, payload);

        if (file) {
          await uploadPostCover(id!, file);
        }

        return nav('/admin/aktualnosci');
      }
    } catch (e: any) {
      alert(e?.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!confirm('Na pewno usunąć wpis?')) return;
    try {
      await removePost(id!);
      nav('/admin/aktualnosci', { replace: true });
    } catch (e: any) {
      alert(e?.message ?? 'Błąd usuwania.');
    }
  };

  return (
    <div className="p-6 space-y-3 max-w-3xl">
      <h1 className="text-2xl font-semibold">{isNew ? 'Nowy wpis' : 'Edytuj wpis'}</h1>

      <input
        className="border p-2 rounded w-full"
        placeholder="Tytuł"
        value={m.title}
        onChange={(e) => setM((s) => ({ ...s, title: e.target.value }))}
      />

      <input
        className="border p-2 rounded w-full"
        placeholder="Slug (bez /)"
        value={m.slug}
        onChange={(e) => setM((s) => ({ ...s, slug: e.target.value }))}
      />

      <textarea
        className="border p-2 rounded w-full"
        rows={3}
        placeholder="Zajawka"
        value={m.excerpt ?? ''}
        onChange={(e) => setM((s) => ({ ...s, excerpt: e.target.value }))}
      />

      <textarea
        className="border p-2 rounded w-full font-mono"
        rows={16}
        placeholder="Treść (Markdown)"
        value={m.body_md}
        onChange={(e) => setM((s) => ({ ...s, body_md: e.target.value }))}
      />

      {/* Okładka: podgląd + input file + ręczne URL (opcjonalnie zostaje) */}
      <div className="grid md:grid-cols-3 gap-4 items-start">
        <div className="space-y-2">
          <div className="text-sm text-text-black/70">Okładka</div>
          <div className="aspect-video rounded-xl border bg-gray-50 overflow-hidden flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-sm text-text-black/70 p-4 text-center">Brak okładki</div>
            )}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="block">
            <span className="text-sm text-text-black/70">Wgraj plik (JPG/PNG)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full"
            />
          </label>

          {/* Opcjonalnie zostawiamy też ręczne URL — jakbyś chciał podać link zewnętrzny */}
          <input
            className="border p-2 rounded w-full"
            placeholder="lub podaj URL okładki"
            value={m.cover_url ?? ''}
            onChange={(e) => setM((s) => ({ ...s, cover_url: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-3 py-2 rounded-xl border"
        >
          {saving ? 'Zapisywanie…' : 'Zapisz szkic'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="px-3 py-2 rounded-xl bg-black text-white"
        >
          {saving ? 'Zapisywanie…' : 'Opublikuj'}
        </button>
        {!isNew && (
          <button onClick={remove} className="px-3 py-2 rounded-xl border">
            Usuń
          </button>
        )}
      </div>
    </div>
  );
}
