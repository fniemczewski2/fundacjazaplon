import { useEffect, useState } from 'react';
import { listDocuments } from '../lib/documents';

export default function PrivacyPolicyLink({ black }: { black?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        const items = await listDocuments('polityka-prywatnosci'); 

        const policyDoc = items.find((doc) => 
          doc.name.toLowerCase().includes('polityka')
        );

        if (policyDoc) {
          setUrl(policyDoc.url);
        }
      } catch (error) {
        console.error('Błąd podczas pobierania Polityki Prywatności:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, []);

  if (loading || !url) {
    return null;
  }

  return (
    <span className={black ? 'text-text-black hover:text-gray-700' : 'text-gray-300 hover:text-white'}>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm transition hover:underline"
    >
      Polityka prywatności
    </a>
    </span>
  );
}