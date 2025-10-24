import { useEffect, useState } from 'react';
import Seo from '../components/Seo';
import { getContact, type ContactInfo } from '../lib/contact';
import Card from '../components/Card';
import { FiCopy, FiCheck } from 'react-icons/fi';
import ContactForm from '../components/ContactForm';

export default function Contact() {
  const [data, setData] = useState<ContactInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getContact().then(setData);
  }, []);

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000); 
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <>
      <Seo title="Kontakt | Fundacja „Zapłon”" />
      <h1 className="section-title">Kontakt</h1>
      <div className="container mt-6 p-4 max-w-4xl space-6 grid md:grid-cols-2 gap-6">
        <ContactForm />
        <Card>
          {data && (
            <>
              <h2 className='text-2xl font-semibold mb-4'>Fundacja „Zapłon”</h2>
              <div className="space-y-4 w-full">
                {data.address && (
                  <div>
                    <div className="text-sm text-text-black/70">Adres</div>
                    <div className='text-lg'>{data.address}</div>
                  </div>
                )}

                {data.krs && (
                  <div className="group relative">
                    <div className="text-sm text-text-black/70">KRS</div>
                    <div className="flex items-center gap-2 text-lg">
                      <span>{data.krs}</span>
                      <button
                        onClick={() => copyToClipboard("krs", data.krs!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-black/70 hover:text-black"
                        aria-label="Skopiuj KRS"
                      >
                        {copied === "krs" ? <FiCheck /> : <FiCopy />}
                      </button>
                    </div>
                    {copied === "krs" && (
                      <div className="absolute text-xs text-brand mt-0.2">Skopiowano!</div>
                    )}
                  </div>
                )}

                {data.nip && (
                  <div className="group relative">
                    <div className="text-sm text-text-black/70">NIP</div>
                    <div className="flex items-center gap-2 text-lg">
                      <span>{data.nip}</span>
                      <button
                        onClick={() => copyToClipboard("nip", data.nip!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-black/70 hover:text-black"
                        aria-label="Skopiuj NIP"
                      >
                        {copied === "nip" ? <FiCheck /> : <FiCopy />}
                      </button>
                    </div>
                    {copied === "nip" && (
                      <div className="absolute text-xs text-brand mt-0.2">Skopiowano!</div>
                    )}
                  </div>
                )}

                {data.regon && (

                  <div className="group relative">
                    <div className="text-sm text-text-black/70">REGON</div>
                    <div className="flex items-center gap-2 text-lg">
                      <span>{data.regon}</span>
                      <button
                        onClick={() => copyToClipboard("regon", data.regon!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-black/70 hover:text-black"
                        aria-label="Skopiuj REGON"
                      >
                        {copied === "regon" ? <FiCheck /> : <FiCopy />}
                      </button>
                    </div>
                    {copied === "regon" && (
                      <div className="absolute text-xs text-brand mt-0.2">Skopiowano!</div>
                    )}
                  </div>
                )}

                {data.phone && (
                  <div>
                    <div className="text-sm text-text-black/70">Telefon</div>
                    <a href={`tel:${data.phone}`} className="hover:underline text-lg">
                      {data.phone}
                    </a>
                  </div>
                )}

                {data.email && (
                  <div>
                    <div className="text-sm text-text-black/70">Email</div>
                    <a href={`mailto:${data.email}`} className="hover:underline text-lg">
                      {data.email}
                    </a>
                  </div>
                )}

                {data.account_number && (
                  <div className="group relative">
                    <div className="text-sm text-text-black/70">Numer konta</div>
                    <div className="flex items-center gap-2 text-lg">
                      <span>{data.account_number}</span>
                      <button
                        onClick={() => copyToClipboard("account", data.account_number!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-black/70 hover:text-black"
                        aria-label="Skopiuj numer konta"
                      >
                        {copied === "account" ? <FiCheck /> : <FiCopy />}
                      </button>
                    </div>
                    {copied === "account" && (
                      <div className="absolute text-xs text-brand mt-0.2">Skopiowano!</div>
                    )}
                  </div>
                )}
              </div>
            </>      
          )} 
        </Card>
        
      </div>
    </>
  );
}
