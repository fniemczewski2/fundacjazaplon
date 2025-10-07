import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type FileRow = { name: string; url: string };

export default function Media() {
  const [files, setFiles] = useState<FileRow[]>([]);

  const list = async () => {
    const { data, error } = await supabase.storage.from('media')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (!error && data) {
      const rows: FileRow[] = await Promise.all(
        data.map(async (f) => {
          const { data: pub } = await supabase.storage.from('media').getPublicUrl(f.name);
          return { name: f.name, url: pub.publicUrl };
        })
      );
      setFiles(rows);
    }
  };

  useEffect(() => { list(); }, []);

  const onChoose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    await supabase.storage.from('media').upload(file.name, file, { upsert: true });
    await list();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media</h1>
        <input type="file" onChange={onChoose} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.map(f => (
          <a key={f.name} href={f.url} target="_blank" className="block border rounded-xl overflow-hidden">
            <img src={f.url} className="w-full aspect-square object-cover" />
            <div className="p-2 text-sm truncate">{f.name}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
