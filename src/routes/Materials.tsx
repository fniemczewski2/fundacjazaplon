import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
import { FaDownload, FaXmark } from 'react-icons/fa6';
import PrivacyPolicyLink from '../components/PrivacyPolicyLink';

interface Material {
  id: string;
  title: string;
  description: string;
  format: string;
  cover_image: string;
  file_url: string;
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
      setErrorMessage('');
      
      try {
        const response = await fetch('/api/subscribe-newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: name,
            email: email, 
            file_url: selectedMaterial.file_url,
            file_title: selectedMaterial.title
          }),
        });

        const contentType = response.headers.get("content-type");
        let data = null;
        if (contentType && contentType.indexOf("application/json") !== -1) {
          data = await response.json();
        }

        if (!response.ok) {
          throw new Error(data?.error || 'Wystąpił błąd. Spróbuj ponownie.');
        }
        
        setStatus('success');
        setEmail('');
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMessage(err.message);
      }
    };
 

  return (
    <>
      <Seo
        title="Materiały | Fundacja „Zapłon”"
        description="Pobierz materiały edukacyjne Fundacji „Zapłon”."
      />
      <h1 className="section-title">Materiały do pobrania</h1>
      
      <div className="container mx-auto mt-6 p-4 max-w-4xl grid gap-6 md:grid-cols-2">
        {status === 'loading' && !selectedMaterial && <Loader />}
        
        {materials.map((mat) => (
          <div key={mat.id} className="card rounded-lg shadow-md overflow-hidden flex flex-col">
            {mat.cover_image && (
              <img src={mat.cover_image} alt={mat.title} className="w-full h-48 object-cover border-b border-gray-100 dark:border-gray-800" />
            )}
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3 gap-2">
                <h3 className="text-xl font-bold text-text-black">{mat.title}</h3>
                <span className="text-xs font-semibold bg-brand-primary/20 text-brand-primary px-2 py-1 rounded whitespace-nowrap">
                  {mat.format}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">{mat.description}</p>
              
              <div className="flex justify-center w-full mt-auto">
                <button
                  onClick={() => { setSelectedMaterial(mat); setStatus('idle'); setEmail(''); setErrorMessage(''); }}
                  className="btn btn-secondary w-full justify-center"
                >
                  Pobierz <FaDownload />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Pobierania */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-md w-full relative shadow-2xl">
            <button 
              onClick={() => setSelectedMaterial(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <FaXmark className="w-6 h-6"/>
            </button>
            <h2 className="text-2xl font-bold mb-4 pr-6">Pobierz: {selectedMaterial.title}</h2>
            
            {status === 'success' ? (
              <div className="text-brand dark:text-accent-orange font-medium py-4 rounded-lg flex flex-col items-center text-center">
                <p className="mb-6 text-lg">Dziękujemy! Twój materiał jest gotowy.</p>
                <a 
                  href={selectedMaterial.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2 mb-2"
                >
                  Pobierz plik teraz <FaDownload />
                </a>
                <p className="text-xs mt-6 opacity-80 font-normal text-text-black dark:text-gray-300">
                  Zapisaliśmy Cię również do newslettera. Jeśli to Twoje pierwsze pobranie dzisiaj, kopię linku znajdziesz w swojej skrzynce e&#x2011;mail.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDownload} className="space-y-5">
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Podaj swój adres e&#x2011;mail, aby otrzymać plik. Przy okazji zapiszemy Cię do naszego newslettera.
                </p>
                
                <div className='flex justify-center w-full flex-col gap-3'>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Twoje imię"
                    className="w-full p-3 border rounded-full outline-none transition-shadow dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Twój adres e-mail"
                    className="w-full p-3 border rounded-full outline-none transition-shadow dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {status === 'error' && (
                    <p className="text-brand dark:text-accent-orange text-sm font-medium mt-2">{errorMessage}</p>
                  )}
                </div>

                <div className="flex justify-center w-full">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="btn btn-primary w-full justify-center disabled:opacity-70"
                  >
                    {status === 'loading' ? 'Wysyłanie...' : <>Wyślij plik <FaDownload className="ml-2" /></>}
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 text-center mt-4">
                  Zapisując się, akceptujesz naszą <PrivacyPolicyLink />
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}