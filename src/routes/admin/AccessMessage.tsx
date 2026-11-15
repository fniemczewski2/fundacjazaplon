import Seo from '../../components/Seo';
import { signOutAdmin } from '../../lib/admin';

type Props = { title: string; text: string; children?: React.ReactNode };

/** Komunikat pełnoekranowy panelu (konto bez roli, brak uprawnień do sekcji). */
export default function AccessMessage({ title, text, children }: Readonly<Props>) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-cool p-6">
      <Seo title={`${title} | Fundacja „Zapłon”`} noindex />
      <div className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-ink" role="status">
          {text}
        </p>
        <div className="flex flex-wrap gap-2">
          {children}
          <button type="button" className="btn btn-secondary" onClick={signOutAdmin}>
            Wyloguj
          </button>
        </div>
      </div>
    </div>
  );
}
