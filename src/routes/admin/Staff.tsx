import { useCallback, useState } from 'react';
import { Link } from 'wouter';
import { useAsyncData } from '../../hooks/useAsyncData';
import { listStaff, removeStaffRole, setStaffRole, type StaffList } from '../../lib/staff';
import { getErrorMessage } from '../../lib/utils/errors';
import { useConfirm, useToast } from '../../components/ui/Feedback';
import Loader from '../../components/Loader';
import Field from '../../components/ui/Field';
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  STAFF_DOMAIN,
  isAssignableRole,
  type AssignableRole,
} from '../../../shared/roles';

const EMPTY: StaffList = { staff: [], pending: [] };

function RoleSelect({
  value,
  onChange,
  label,
  disabled,
}: Readonly<{
  value: AssignableRole | '';
  onChange: (role: AssignableRole) => void;
  label: string;
  disabled?: boolean;
}>) {
  return (
    <select
      aria-label={label}
      className="border p-2 rounded"
      value={value}
      disabled={disabled}
      onChange={(e) => isAssignableRole(e.target.value) && onChange(e.target.value)}
    >
      {value === '' && <option value="">Wybierz rolę</option>}
      {ASSIGNABLE_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

export default function AdminStaff() {
  const fetchList = useCallback(() => listStaff(), []);
  const { data, loading, error, reload } = useAsyncData(
    fetchList,
    EMPTY,
    'Nie udało się wczytać listy uprawnień.',
  );
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('editor');
  const showToast = useToast();
  const confirm = useConfirm();

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await reload();
      showToast(success, 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Operacja nie powiodła się.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(async () => {
      await setStaffRole(email.trim(), role);
      setEmail('');
    }, 'Uprawnienia zapisane.');
  };

  const onRemove = async (target: string) => {
    const confirmed = await confirm(`Odebrać uprawnienia: ${target}?`, {
      title: 'Odbierz uprawnienia',
      confirmLabel: 'Odbierz',
    });
    if (confirmed) void run(() => removeStaffRole(target), 'Uprawnienia odebrane.');
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Uprawnienia</h1>
        <Link to="/admin" className="btn btn-secondary">
          Panel
        </Link>
      </div>

      <p className="text-sm text-ink-muted">
        Redaktor dodaje i edytuje treści strony. Administrator dodatkowo usuwa treści oraz
        zatwierdza rozliczenia, umowy i podpisuje je za fundację. Konta w domenie @{STAFF_DOMAIN}{' '}
        bez roli nie mają dostępu.
      </p>

      {loading && <Loader />}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Osoby z uprawnieniami</h2>
        {data.staff.length === 0 ? (
          <p className="text-sm text-ink-muted">Brak wpisów.</p>
        ) : (
          <ul className="divide-y border rounded-xl">
            {data.staff.map((m) => (
              <li key={m.email} className="p-3 flex flex-wrap items-center justify-between gap-3">
                <span className="break-all">{m.email}</span>
                {m.role === 'super_admin' ? (
                  <span className="text-sm text-ink-muted">
                    {ROLE_LABELS.super_admin} (zmienna środowiskowa)
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RoleSelect
                      label={`Rola: ${m.email}`}
                      value={isAssignableRole(m.role) ? m.role : 'editor'}
                      disabled={busy}
                      onChange={(next) =>
                        void run(() => setStaffRole(m.email, next), 'Uprawnienia zapisane.')
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => void onRemove(m.email)}
                    >
                      Odbierz
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Zalogowane konta bez roli</h2>
        {data.pending.length === 0 ? (
          <p className="text-sm text-ink-muted">Brak oczekujących kont.</p>
        ) : (
          <ul className="divide-y border rounded-xl">
            {data.pending.map((p) => (
              <li key={p.email} className="p-3 flex flex-wrap items-center justify-between gap-3">
                <span className="break-all">{p.email}</span>
                <RoleSelect
                  label={`Nadaj rolę: ${p.email}`}
                  value=""
                  disabled={busy}
                  onChange={(next) =>
                    void run(() => setStaffRole(p.email, next), 'Uprawnienia zapisane.')
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Nadaj rolę po adresie e-mail</h2>
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3">
          <Field label="Adres e-mail">
            {(a11y) => (
              <input
                {...a11y}
                className="input-plain"
                type="email"
                placeholder={`imie.nazwisko@${STAFF_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </Field>
          <RoleSelect label="Rola" value={role} onChange={setRole} disabled={busy} />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Zapisz
          </button>
        </form>
      </section>
    </div>
  );
}
