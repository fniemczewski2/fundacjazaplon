// src/routes/admin/team/TeamList.tsx
import { Link } from 'wouter';
import { listTeam, type TeamMember } from '../../../lib/team';
import Loader from '../../../components/Loader';
import { useAsyncData } from '../../../hooks/useAsyncData';

export default function TeamList() {
  const { data: rows, loading, error: err, reload: refresh } = useAsyncData(listTeam, [] as TeamMember[], 'Błąd pobierania danych.');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Zespół</h1>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} className="px-3 py-2 rounded-xl border">Odśwież</button>
          <Link to="/admin/zespol/new" className="btn btn-primary">Dodaj</Link>
        </div>
      </div>

      {renderTeam()}
    </div>
  );

  function renderTeam() {
    if (loading) return <Loader />;
    if (err) return <div className="text-sm text-danger">{err}</div>;

    return (
      <ul className="space-y-2">
        {rows.map((m) => (
          <li key={m.id} className="p-3 border rounded-xl flex items-center justify-between">
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-ink-muted">
                {m.role ?? ''} • #{m.order_index} • {m.active ? 'aktywny' : 'ukryty'}
              </div>
            </div>
            <Link to={`/admin/zespol/${m.id}`} className="px-3 py-2 rounded-xl border">Edytuj</Link>
          </li>
        ))}
      </ul>
    );
  }
}
