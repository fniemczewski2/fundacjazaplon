import { useEffect, useState } from 'react';
import { getContact, saveContact, type ContactInfo } from '../../../lib/contact';
import Loader from '../../../components/Loader';

type Model = {
  id?: string;
  address: string;
  krs: string;
  nip: string;
  regon: string;
  phone: string;
  email: string;
  account_number: string;
};

const empty: Model = {
  address: '',
  krs: '',
  nip: '',
  regon: '',
  phone: '',
  email: '',
  account_number: '',
};

export default function ContactEdit() {
  const [m, setM] = useState<Model>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      const data = await getContact();
      if (!alive) return;
      if (data) {
        setM({
          id: data.id,
          address: data.address ?? '',
          krs: data.krs ?? '',
          nip: data.nip ?? '',
          regon: data.regon ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          account_number: data.account_number ?? '',
        });
      } else {
        setM(empty);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setErr(null); setOk(null);
    try {
      await saveContact(m);
      setOk('Zapisano.');
    } catch (e: any) {
      setErr(e?.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader/>;

  const Input = (props: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <label className="block">
      <div className="text-sm text-text-black/70 mb-1">{props.label}</div>
      <input
        type={props.type ?? 'text'}
        className="border p-2 rounded w-full"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Kontakt</h1>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {ok && <div className="text-sm text-green-600">{ok}</div>}

      <div className="grid gap-4">
        <label className="block">
          <div className="text-sm text-text-black/70 mb-1">Adres</div>
          <textarea
            className="border p-2 rounded w-full"
            rows={3}
            value={m.address}
            onChange={(e) => setM(s => ({ ...s, address: e.target.value }))}
            placeholder="np. ul. Przykładowa 10, 00-000 Miasto"
          />
        </label>

        <Input label="KRS" value={m.krs} onChange={(v) => setM(s => ({ ...s, krs: v }))} />
        <Input label="NIP" value={m.nip} onChange={(v) => setM(s => ({ ...s, nip: v }))} />
        <Input label="REGON" value={m.regon} onChange={(v) => setM(s => ({ ...s, regon: v }))} />
        <Input label="Telefon" value={m.phone} onChange={(v) => setM(s => ({ ...s, phone: v }))} />
        <Input label="Email" value={m.email} onChange={(v) => setM(s => ({ ...s, email: v }))} type="email" />
        <Input label="Numer konta" value={m.account_number} onChange={(v) => setM(s => ({ ...s, account_number: v }))} />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={`px-3 py-2 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-black'}`}
      >
        {saving ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </div>
  );
}
