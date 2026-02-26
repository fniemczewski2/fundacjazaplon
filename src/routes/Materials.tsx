import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Section from '../components/Section';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
import { FaDownload, FaX, FaXmark } from 'react-icons/fa6';

// Typ dla materiału
interface Material {
  id: string;
  title: string;
  description: string;
  format: string;
  cover_image: string;
  automation_group_id: string;
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchMaterials = async () => {
      const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (data) setMaterials(data);
    };
    fetchMaterials();
  }, []);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !email) return;

    setStatus('loading');
    try {
      // Wywołanie Serverless Function (np. Vercel lub Netlify)
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          groupId: selectedMaterial.automation_group_id 
        }),
      });

      if (!response.ok) throw new Error('Błąd zapisu');
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <>
          <Seo
            title="Materiały | Fundacja „Zapłon”"
            description="Pobierz materiały edukacyjne Fundacji „Zapłon”."
          />
          <h1 className="section-title">Materiały do pobrania</h1>
      <div className="container mx-auto mt-6 p-4 max-w-4xl grid gap-6">
        {status === 'loading' && <Loader />}
          {materials.map((mat) => (
            <div key={mat.id} className="card rounded-lg shadow-md overflow-hidden">
              {mat.cover_image && (
                <img src={mat.cover_image} alt={mat.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-text-black">{mat.title}</h3>
                  <span className="text-xs font-semibold bg-brand-primary text-text-black px-2 py-1 rounded">
                    {mat.format}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{mat.description}</p>
                <div className="justify-center flex w-full">
                <button
                  onClick={() => { setSelectedMaterial(mat); setStatus('idle'); setEmail(''); }}
                  className="btn btn-secondary mx-auto"
                >
                  Pobierz<FaDownload/>
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Pobierania */}
        {selectedMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full relative">
              <button 
                onClick={() => setSelectedMaterial(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white"
              >
                <FaXmark className='w-5 h-5'/>
              </button>
              <h2 className="text-2xl font-bold mb-4">Pobierz: {selectedMaterial.title}</h2>
              
              {status === 'success' ? (
                <div className="text-brand font-semibold text-center">
                  Dziękujemy! Materiał został wysłany na Twój adres e-mail. Sprawdź swoją skrzynkę (również folder SPAM).
                </div>
              ) : (
                <form onSubmit={handleDownload} className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Podaj swój adres e-mail, aby otrzymać plik. Zapiszemy Cię również do naszego newslettera.
                  </p>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Twoj adres e-mail"
                    className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <div className="justify-center flex w-full">
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {status === 'loading' ? 'Wysyłanie...' : <>Wyślij plik <FaDownload className="mr-2" /></>}
                    </button>
                  </div>
                  {status === 'error' && (
                    <p className="text-red-500 text-sm text-center">Wystąpił błąd. Spróbuj ponownie później.</p>
                  )}
                  
                </form>
              )}
            </div>
          </div>
        )}
    </>
  );
}