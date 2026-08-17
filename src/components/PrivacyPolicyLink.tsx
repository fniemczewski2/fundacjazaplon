import { useEffect, useState } from 'react';
import { listDocuments } from '../lib/documents';

/**
 * Link do polityki prywatności pobieranej z Supabase.
 *
 * Kolory pochodzą teraz z tokenów motywu. Wcześniej były zaszyte na sztywno
 * (`text-gray-300` w stopce, `text-gray-700` w kartach), przez co w motywie
 * ciemnym link wtapiał się w tło.
 */
export default function PrivacyPolicyLink({ black }: { black?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const items = await listDocuments('polityka-prywatnosci');
        const policyDoc = items.find((doc) => doc.name.toLowerCase().includes('polityka'));
        if (alive && policyDoc) setUrl(policyDoc.url);
      } catch (error) {
        console.error('Nie udało się pobrać polityki prywatności:', error);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      // `black` = link stoi na jasnej karcie, więc dostaje kolor akcentu.
      // Bez niego dziedziczy kolor otoczenia (stopka na granacie).
      className={
        black
          ? 'link-accent text-sm'
          : 'text-sm underline-offset-4 transition-colors hover:underline'
      }
    >
      Polityka prywatności
      <span className="sr-only"> - otwiera się w nowej karcie</span>
    </a>
  );
}
