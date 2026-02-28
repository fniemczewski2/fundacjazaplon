import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function MaterialsAdmin() {
  const [materials, setMaterials] = useState<any[]>([]);
  // Usunięto 'automation_group_id' ze stanu formularza
  const [form, setForm] = useState({ title: '', description: '', file_url: '', cover_image: '', format: 'PDF' });

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
    // Resetowanie formularza (bez automation_group_id)
    setForm({ title: '', description: '', file_url: '', cover_image: '', format: 'PDF' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Usunąć ten materiał?')) {
      await supabase.from('materials').delete().eq('id', id);
      fetchMaterials();
    }
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
            onChange={e => setForm({...form, title: e.target.value})} 
            className="border p-2 rounded w-full outline-none focus:border-brand-primary" 
          />
          <input 
            placeholder="Format (np. PDF, PPTX)" 
            value={form.format} 
            onChange={e => setForm({...form, format: e.target.value})} 
            className="border p-2 rounded w-full outline-none focus:border-brand-primary" 
          />
          <textarea 
            placeholder="Opis" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            className="border p-2 rounded w-full md:col-span-2outline-none focus:border-brand-primary" 
          />
          <input 
            required 
            placeholder="Link do pliku (URL)" 
            value={form.file_url} 
            onChange={e => setForm({...form, file_url: e.target.value})} 
            className="border p-2 rounded w-full outline-none focus:border-brand-primary" 
          />
          <input 
            placeholder="Link do miniatury (URL)" 
            value={form.cover_image} 
            onChange={e => setForm({...form, cover_image: e.target.value})} 
            className="border p-2 rounded w-fullfocus:border-brand-primary" 
          />
          
          <div className="md:col-span-2 mt-2">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors">
              Dodaj materiał
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Po dodaniu materiału, użytkownicy po pobraniu automatycznie otrzymają e-mail z wybranym linkiem (dzięki globalnej automatyzacji MailerLite).
            </p>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {materials.map(mat => (
          <div key={mat.id} className="bg-whitep-4 rounded shadow flex justify-between items-center">
            <div className="pr-4">
              <h3 className="font-bold">{mat.title} <span className="text-sm font-normal text-gray-500">({mat.format})</span></h3>
              {/* Zamiast ID Grupy, wyświetlamy link, żebyś widział co zostało dodane */}
              <p className="text-sm text-brand-primary truncate max-w-[250px] sm:max-w-md lg:max-w-xl" title={mat.file_url}>
                🔗 {mat.file_url}
              </p>
            </div>
            <button onClick={() => handleDelete(mat.id)} className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors whitespace-nowrap">
              Usuń
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}