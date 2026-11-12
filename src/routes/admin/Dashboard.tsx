// src/routes/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { getAdminCounts, getCurrentUserEmail, signOutAdmin, type AdminCounts } from '../../lib/admin';
import Loader from '../../components/Loader';

export default function AdminDashboard() {
  const [counts, setCounts] = useState<AdminCounts>({
    newsPublished: 0,
    newsDrafts: 0,
    teamCount: 0,
    oNasUpdatedAt: null,
    kontaktUpdatedAt: null,
  });
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [email, counts] = await Promise.all([
        getCurrentUserEmail(),
        getAdminCounts(),
      ]);
      setEmail(email);
      setCounts(counts);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="border-r p-4 space-y-4">
        <div className="space-y-1">
          <div className="text-sm text-ink-muted">Zalogowany jako</div>
          <div className="font-medium break-all">{email ?? '-'}</div>
        </div>

        <nav className="space-y-2">
          <SectionLabel>Treści</SectionLabel>
          <NavItem to="/admin/aktualnosci">Aktualności</NavItem>
          <NavItem to="/admin/strony/o-nas">O nas</NavItem>
          <NavItem to="/admin/zespol">Zespół</NavItem>
          <NavItem to="/admin/strony/kontakt">Kontakt</NavItem>
          <NavItem to="/admin/strony/join">Dołącz do nas</NavItem>
          <NavItem to="/admin/strony/social">Social Media</NavItem>

          <SectionLabel>Finanse i współpraca</SectionLabel>
          <NavItem to="/admin/rozliczenia">Rozliczenia faktur</NavItem>
          <NavItem to="/admin/umowy">Umowy i zgody</NavItem>

          <SectionLabel>Pliki</SectionLabel>
          <NavItem to="/admin/media">Media</NavItem>
          <NavItem to="/admin/dokumenty">Dokumenty</NavItem>
          <NavItem to="/admin/strony/materials">Materiały do pobrania</NavItem>
        </nav>

        <div className="pt-4">
          <button
            type="button"
            onClick={signOutAdmin}
            className="btn btn-secondary w-full"
          >
            Wyloguj
          </button>
        </div>
      </aside>

      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Panel administracyjny</h1>
          <div className="text-sm text-ink-muted">
            {loading && <Loader />}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Opublikowane aktualności" value={counts.newsPublished} to="/admin/aktualnosci" />
          <KpiCard label="Szkice aktualności" value={counts.newsDrafts} to="/admin/aktualnosci" />
          <KpiCard label="Członkowie zespołu" value={counts.teamCount} to="/admin/zespol" />
          <div className="border rounded-2xl p-4">
            <div className="text-sm text-ink-muted">Szybkie akcje</div>
            <div className="mt-3 grid gap-2">
              <QuickAction to="/admin/aktualnosci/new">Nowa aktualność</QuickAction>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <PageCard title="Strona „O nas”" updatedAt={<NiceDate iso={counts.oNasUpdatedAt} />} to="/admin/strony/o-nas" />
          <PageCard title="Strona „Kontakt”" updatedAt={<NiceDate iso={counts.kontaktUpdatedAt} />} to="/admin/strony/kontakt" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ShortcutCard
            title="Zarządzaj aktualnościami"
            description="Dodawaj, edytuj i publikuj treści na stronie Aktualności."
            to="/admin/aktualnosci"
            cta="Przejdź do listy"
          />
          <ShortcutCard
            title="Zarządzaj zespołem"
            description="Edytuj skład zespołu, role i kolejność wyświetlania."
            to="/admin/zespol"
            cta="Przejdź do zespołu"
          />
        </section>
      </main>
    </div>
  );
}

/* --- Helper UI components --- */
function NiceDate({ iso }: Readonly<{ iso: string | null }>) {
  if (!iso) return <span className="text-ink-muted">brak danych</span>;
  return <span>{new Date(iso).toLocaleString()}</span>;
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="text-xs uppercase tracking-wide text-ink-muted">{children}</div>;
}

function NavItem({ to, children }: Readonly<{ to: string; children: React.ReactNode }>) {
  return (
    <Link to={to} className="block w-full px-3 py-2 rounded-xl text-ink hover:bg-surface-cool border border-transparent hover:border-line">
      {children}
    </Link>
  );
}

function KpiCard({ label, value, to }: Readonly<{ label: string; value: number | string; to?: string }>) {
  const content = (
    <div className="border rounded-2xl p-4">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
  return to ? <Link to={to} className="block hover:border-line-strong">{content}</Link> : content;
}

function QuickAction({ to, children }: Readonly<{ to: string; children: React.ReactNode }>) {
  return (
    <Link to={to} className="inline-flex items-center justify-center btn btn-secondary">
      {children}
    </Link>
  );
}

function PageCard({ title, updatedAt, to }: Readonly<{ title: string; updatedAt: React.ReactNode; to: string }>) {
  return (
    <div className="border rounded-2xl p-4 flex items-start justify-between">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-ink-muted">Ostatnia aktualizacja: {updatedAt}</div>
      </div>
      <Link to={to} className="btn btn-secondary">Edytuj</Link>
    </div>
  );
}

function ShortcutCard({ title, description, to, cta }: Readonly<{ title: string; description: string; to: string; cta: string }>) {
  return (
    <div className="border rounded-2xl p-5">
      <div className="text-lg font-medium">{title}</div>
      <p className="text-sm text-ink-muted mt-1">{description}</p>
      <Link to={to} className="inline-block mt-3 btn btn-secondary">{cta}</Link>
    </div>
  );
}
