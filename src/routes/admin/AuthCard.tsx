import Seo from '../../components/Seo';

type Props = {
  title: string;
  heading: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
};

/** Wspólna rama stron logowania i resetu hasła. Strony są wyłączone z indeksu wyszukiwarek. */
export default function AuthCard({ title, heading, onSubmit, children }: Readonly<Props>) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-cool p-6">
      <Seo title={`${title} | Fundacja „Zapłon”`} noindex />
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="font-heading text-2xl font-semibold">{heading}</h1>
        {children}
      </form>
    </div>
  );
}
