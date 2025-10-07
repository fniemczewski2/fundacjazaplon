// src/routes/admin/team/TeamList.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTeam, type TeamMember } from '../../../lib/team';
import Loader from '../../../components/Loader';

export default function TeamList() {
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await listTeam(); 
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Błąd pobierania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Zespół</h1>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-2 rounded-xl border">Odśwież</button>
          <Link to="/admin/zespol/new" className="px-3 py-2 rounded-xl bg-black text-white">Dodaj</Link>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.id} className="p-3 border rounded-xl flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-text-black/70">
                  {m.role ?? ''} • #{m.order_index} • {m.active ? 'aktywny' : 'ukryty'}
                </div>
              </div>
              <Link to={`/admin/zespol/${m.id}`} className="px-3 py-2 rounded-xl border">Edytuj</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
