import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function MaterialsAdmin() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', file_url: '', cover_image: '', format: 'PDF', automation_group_id: '' });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('materials').insert([form]);
    fetchMaterials();
    setForm({ title: '', description: '', file_url: '', cover_image: '', format: 'PDF', automation_group_id: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Usunąć?')) {
      await supabase.from('materials').delete().eq('id', id);
      fetchMaterials();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Zarządzanie Materiałami (Lead Magnets)</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">Dodaj nowy materiał</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="Tytuł" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="border p-2 rounded w-full" />
          <input placeholder="Format (np. PDF, PPTX)" value={form.format} onChange={e => setForm({...form, format: e.target.value})} className="border p-2 rounded w-full" />
          <textarea placeholder="Opis" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border p-2 rounded w-full md:col-span-2" />
          <input required placeholder="Link do pliku (URL)" value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})} className="border p-2 rounded w-full" />
          <input placeholder="Link do miniatury (URL)" value={form.cover_image} onChange={e => setForm({...form, cover_image: e.target.value})} className="border p-2 rounded w-full" />
          <input required placeholder="MailerLite Group ID" value={form.automation_group_id} onChange={e => setForm({...form, automation_group_id: e.target.value})} className="border p-2 rounded w-full md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Dodaj materiał</button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {materials.map(mat => (
          <div key={mat.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between items-center">
            <div>
              <h3 className="font-bold">{mat.title} ({mat.format})</h3>
              <p className="text-sm text-gray-500">Grupa MailerLite: {mat.automation_group_id}</p>
            </div>
            <button onClick={() => handleDelete(mat.id)} className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded">Usuń</button>
          </div>
        ))}
      </div>
    </div>
  );
}