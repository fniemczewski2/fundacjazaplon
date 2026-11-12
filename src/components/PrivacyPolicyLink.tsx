import { Link } from 'wouter';
import { usePrivacyPolicyDocUrl } from '../hooks/useAppData';

/**
 * Link do polityki prywatności. Gdy w panelu wgrano PDF, prowadzi do niego, w przeciwnym razie do stałej strony
 * serwisu, więc link jest dostępny zawsze (wymóg informacyjny przy każdym formularzu).
 */
export default function PrivacyPolicyLink({ black }: Readonly<{ black?: boolean }>) {
  const { data: pdfUrl } = usePrivacyPolicyDocUrl();
  // `black` = link stoi na jasnej karcie, więc dostaje kolor akcentu. Bez niego dziedziczy kolor otoczenia (stopka).
  const className = black ? 'link-accent text-sm' : 'text-sm underline-offset-4 transition-colors hover:underline';

  if (pdfUrl) {
    return (
      <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={className}>
        Polityka prywatności <span className="sr-only">- otwiera się w nowej karcie</span>
      </a>
    );
  }

  return (
    <Link href="/polityka-prywatnosci" className={className}>
      Polityka prywatności
    </Link>
  );
}
