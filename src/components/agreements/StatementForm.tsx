import { useId } from 'react';
import Field from '../ui/Field';
import { EMPTY_STATEMENT, formatIban, isValidPlIban, normalizeIban, type ContractorStatement } from '../../lib/agreements';

/**
 * Oświadczenie zleceniobiorcy - formularz odwzorowujący wzór fundacji (punkty 1-12). Każde pytanie „tak/nie”
 * wymaga świadomej odpowiedzi, bez wartości domyślnych, bo odpowiedzi trafiają do rozliczeń ZUS i podatków.
 */

export type Tri = '' | 'yes' | 'no';
export const TRI_KEYS = [
  'employed', 'leave', 'otherContract', 'otherTitle', 'pensioner', 'disability', 'student', 'unemployed', 'otherInsurance',
  'voluntarySickness', 'voluntaryPension', 'pitExemption', 'taxResidency', 'authorCostsExceeded',
] as const;
export type TriKey = (typeof TRI_KEYS)[number];

export type StatementState = { st: ContractorStatement; tri: Record<TriKey, Tri>; truthful: boolean };

const emptyTri = (): Record<TriKey, Tri> => Object.fromEntries(TRI_KEYS.map((k) => [k, ''])) as Record<TriKey, Tri>;
export const emptyStatementState = (): StatementState => ({ st: { ...EMPTY_STATEMENT }, tri: emptyTri(), truthful: false });

export function statementStateFrom(saved: ContractorStatement | null): StatementState {
  if (!saved) return emptyStatementState();
  const tri = Object.fromEntries(TRI_KEYS.map((k) => [k, saved[k] ? 'yes' : 'no'])) as Record<TriKey, Tri>;
  return { st: { ...EMPTY_STATEMENT, ...saved, iban: saved.iban ? formatIban(saved.iban) : '' }, tri, truthful: true };
}

/** Pierwszy wykryty problem albo null. Serwer waliduje te same reguły ponownie. */
export function statementProblem({ st, tri }: StatementState): string | null {
  const need = (v: string, label: string) => (v.trim().length < 2 ? `${label}: uzupełnij pole.` : null);
  const checks = [
    need(st.postOffice, 'Poczta'), need(st.gmina, 'Gmina'), need(st.powiat, 'Powiat'), need(st.voivodeship, 'Województwo'),
    need(st.taxOffice, 'Urząd skarbowy'), need(st.nfzBranch, 'Oddział NFZ'),
    isValidPlIban(normalizeIban(st.iban)) ? null : 'Podaj poprawny polski numer konta (26 cyfr).',
  ];
  for (const c of checks) if (c) return c;
  if (TRI_KEYS.some((k) => !tri[k])) return 'Odpowiedz na wszystkie punkty oświadczenia.';

  const period = (on: boolean, from: string, to: string, label: string) =>
    on && (!from || !to || to < from) ? `${label}: podaj poprawne daty od i do.` : null;
  return (
    period(tri.employed === 'yes', st.employedFrom, st.employedTo, 'Pkt 1') ??
    (tri.employed === 'yes' && !st.employedSalary ? 'Pkt 1: wskaż wysokość wynagrodzenia.' : null) ??
    period(tri.leave === 'yes', st.leaveFrom, st.leaveTo, 'Pkt 2') ??
    (tri.leave === 'yes' && !st.leaveType ? 'Pkt 2: wskaż rodzaj urlopu.' : null) ??
    period(tri.otherContract === 'yes', st.otherContractFrom, st.otherContractTo, 'Pkt 3') ??
    (tri.otherContract === 'yes' && st.otherContractExceeds === null ? 'Pkt 3: wskaż, czy wynagrodzenie przekracza minimalne.' : null) ??
    (tri.otherTitle === 'yes' && st.otherTitleText.trim().length < 2 ? 'Pkt 4: podaj tytuł do ubezpieczenia.' : null) ??
    (tri.pensioner === 'yes' && st.pensionDecision.trim().length < 2 ? 'Pkt 5: podaj numer decyzji ZUS i datę przyznania.' : null) ??
    period(tri.disability === 'yes', st.disabilityFrom, st.disabilityTo, 'Pkt 6') ??
    (tri.disability === 'yes' && !st.disabilityDegree ? 'Pkt 6: wskaż stopień niepełnosprawności.' : null) ??
    period(tri.taxResidency === 'yes', st.taxResidencyFrom, st.taxResidencyTo, 'Pkt 11') ??
    (st.authorCostsApplied.trim() ? null : 'Pkt 12: podaj kwotę dotychczas zastosowanych kosztów autorskich (np. 0,00).')
  );
}

export function statementPayload({ st, tri, truthful }: StatementState): ContractorStatement & { truthful: boolean } {
  const y = (k: TriKey) => tri[k] === 'yes';
  return {
    ...st, iban: normalizeIban(st.iban),
    employed: y('employed'), leave: y('leave'), otherContract: y('otherContract'), otherTitle: y('otherTitle'), pensioner: y('pensioner'),
    disability: y('disability'), student: y('student'), unemployed: y('unemployed'), otherInsurance: y('otherInsurance'),
    voluntarySickness: y('voluntarySickness'), voluntaryPension: y('voluntaryPension'), pitExemption: y('pitExemption'),
    taxResidency: y('taxResidency'), authorCostsExceeded: y('authorCostsExceeded'), truthful,
  };
}

// --- elementy ---------------------------------------------------------------------------------------

function Choice({ legend, no, yes, value, onChange }: Readonly<{ legend: React.ReactNode; no: string; yes: string; value: Tri; onChange: (v: Tri) => void }>) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="leading-relaxed">{legend}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {([['no', no], ['yes', yes]] as const).map(([v, label]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2">
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="size-5 accent-(--color-brand)" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const date = (a: object, value: string, onChange: (v: string) => void) => (
  <input {...a} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="input-text" />
);

function Period({ from, to, onFrom, onTo }: Readonly<{ from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Od">{(a) => date(a, from, onFrom)}</Field>
      <Field label="Do">{(a) => date(a, to, onTo)}</Field>
    </div>
  );
}

export default function StatementForm({ value, onChange }: Readonly<{ value: StatementState; onChange: (v: StatementState) => void }>) {
  const { st, tri } = value;
  const set = <K extends keyof ContractorStatement>(key: K, v: ContractorStatement[K]) => onChange({ ...value, st: { ...st, [key]: v } });
  const setTri = (key: TriKey, v: Tri) => onChange({ ...value, tri: { ...tri, [key]: v } });
  const text = (key: keyof ContractorStatement, label: string, extra: { hint?: string; maxLength?: number } = {}) => (
    <Field label={label} hint={extra.hint}>
      {(a) => <input {...a} type="text" autoComplete="off" maxLength={extra.maxLength ?? 100} value={String(st[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} className="input-text" />}
    </Field>
  );
  const detail = 'mt-3 space-y-4 rounded-2xl border p-4 panel-cool';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading mb-3 text-lg font-semibold">Adres i dane do rozliczeń</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('postOffice', 'Poczta')}{text('gmina', 'Gmina')}{text('powiat', 'Powiat')}{text('voivodeship', 'Województwo')}
          {text('taxOffice', 'Urząd skarbowy', { maxLength: 150 })}{text('nfzBranch', 'Oddział NFZ')}
        </div>
        <div className="mt-4">
          <Field label="Numer konta bankowego">
            {(a) => <input {...a} type="text" inputMode="numeric" autoComplete="off" value={st.iban} onChange={(e) => set('iban', e.target.value)} onBlur={() => st.iban.trim() && set('iban', formatIban(normalizeIban(st.iban)))} className="input-text font-mono" />}
          </Field>
        </div>
      </div>

      <div className="space-y-5">
        <h3 className="font-heading text-lg font-semibold">Oświadczam, że</h3>

        <div>
          <Choice legend="1. Jestem jednocześnie zatrudniona/ny na podstawie umowy o pracę lub równorzędnej." no="Nie jestem" yes="Jestem" value={tri.employed} onChange={(v) => setTri('employed', v)} />
          {tri.employed === 'yes' && (
            <div className={detail}>
              <Period from={st.employedFrom} to={st.employedTo} onFrom={(v) => set('employedFrom', v)} onTo={(v) => set('employedTo', v)} />
              <Choice legend="Moje wynagrodzenie ze stosunku pracy w kwocie brutto wynosi" no="co najmniej minimalne wynagrodzenie" yes="mniej niż minimalne wynagrodzenie" value={st.employedSalary === 'min' ? 'no' : st.employedSalary === 'below' ? 'yes' : ''} onChange={(v) => set('employedSalary', v === 'no' ? 'min' : 'below')} />
            </div>
          )}
        </div>

        <div>
          <Choice legend="2. W czasie wykonywania umowy zlecenie przebywam na urlopie bezpłatnym, wychowawczym lub macierzyńskim." no="Nie przebywam" yes="Przebywam" value={tri.leave} onChange={(v) => setTri('leave', v)} />
          {tri.leave === 'yes' && (
            <div className={detail}>
              <Field label="Rodzaj urlopu">
                {(a) => (
                  <select {...a} value={st.leaveType} onChange={(e) => set('leaveType', e.target.value as ContractorStatement['leaveType'])} className="input-text sm:max-w-xs">
                    <option value="">Wybierz</option><option value="unpaid">bezpłatny</option><option value="parental">wychowawczy</option><option value="maternity">macierzyński</option>
                  </select>
                )}
              </Field>
              <Period from={st.leaveFrom} to={st.leaveTo} onFrom={(v) => set('leaveFrom', v)} onTo={(v) => set('leaveTo', v)} />
            </div>
          )}
        </div>

        <div>
          <Choice legend="3. Jestem jednocześnie już ubezpieczona/ny (ubezpieczenie emerytalne i rentowe) jako osoba wykonująca pracę nakładczą, umowę zlecenia lub agencyjną." no="Nie jestem" yes="Jestem" value={tri.otherContract} onChange={(v) => setTri('otherContract', v)} />
          {tri.otherContract === 'yes' && (
            <div className={detail}>
              <Period from={st.otherContractFrom} to={st.otherContractTo} onFrom={(v) => set('otherContractFrom', v)} onTo={(v) => set('otherContractTo', v)} />
              <Choice legend="Wynagrodzenie z tej umowy minimalnego wynagrodzenia za pracę" no="nie przekracza" yes="przekracza" value={st.otherContractExceeds === null ? '' : st.otherContractExceeds ? 'yes' : 'no'} onChange={(v) => set('otherContractExceeds', v === 'yes')} />
            </div>
          )}
        </div>

        <div>
          <Choice legend="4. Jestem już ubezpieczona/ny (ubezpieczenie emerytalne i rentowe) z innych tytułów niż w pkt 1 i 2 (np. JDG, KRUS)." no="Nie jestem" yes="Jestem" value={tri.otherTitle} onChange={(v) => setTri('otherTitle', v)} />
          {tri.otherTitle === 'yes' && <div className={detail}>{text('otherTitleText', 'Tytuł do ubezpieczenia', { maxLength: 150 })}</div>}
        </div>

        <div>
          <Choice legend="5. Jestem emerytem lub rencistą." no="Nie jestem" yes="Jestem" value={tri.pensioner} onChange={(v) => setTri('pensioner', v)} />
          {tri.pensioner === 'yes' && <div className={detail}>{text('pensionDecision', 'Numer decyzji ZUS i data jej przyznania')}</div>}
        </div>

        <div>
          <Choice legend="6. Posiadam orzeczenie o lekkim, umiarkowanym lub znacznym stopniu niepełnosprawności." no="Nie posiadam" yes="Posiadam" value={tri.disability} onChange={(v) => setTri('disability', v)} />
          {tri.disability === 'yes' && (
            <div className={detail}>
              <Field label="Stopień niepełnosprawności">
                {(a) => (
                  <select {...a} value={st.disabilityDegree} onChange={(e) => set('disabilityDegree', e.target.value as ContractorStatement['disabilityDegree'])} className="input-text sm:max-w-xs">
                    <option value="">Wybierz</option><option value="lekki">lekki</option><option value="umiarkowany">umiarkowany</option><option value="znaczny">znaczny</option>
                  </select>
                )}
              </Field>
              <Period from={st.disabilityFrom} to={st.disabilityTo} onFrom={(v) => set('disabilityFrom', v)} onTo={(v) => set('disabilityTo', v)} />
            </div>
          )}
        </div>

        <Choice legend="7. Jestem uczniem lub studentem do 26. roku życia." no="Nie jestem" yes="Jestem" value={tri.student} onChange={(v) => setTri('student', v)} />
        <Choice legend="8. Jestem zarejestrowana/ny jako osoba bezrobotna." no="Nie jestem" yes="Jestem" value={tri.unemployed} onChange={(v) => setTri('unemployed', v)} />
        <Choice legend="9. Jestem objęta/ty ubezpieczeniem społecznym z innego tytułu." no="Nie jestem" yes="Jestem" value={tri.otherInsurance} onChange={(v) => setTri('otherInsurance', v)} />

        <div className="space-y-4 rounded-2xl border p-4 panel-cool">
          <p className="leading-relaxed">Zgodnie z powyższym oświadczeniem z tytułu wykonywania tej umowy:</p>
          <Choice legend="Być objęta/ty dobrowolnym ubezpieczeniem chorobowym" no="nie chcę" yes="chcę" value={tri.voluntarySickness} onChange={(v) => setTri('voluntarySickness', v)} />
          <Choice legend="Być objęta/ty dobrowolnym ubezpieczeniem emerytalnym i rentowym" no="nie chcę" yes="chcę" value={tri.voluntaryPension} onChange={(v) => setTri('voluntaryPension', v)} />
        </div>

        <Choice legend="10. Aby moje przychody zostały objęte zwolnieniem z PIT." no="Nie chcę" yes="Chcę" value={tri.pitExemption} onChange={(v) => setTri('pitExemption', v)} />

        <div>
          <Choice legend="11. Posiadam certyfikat rezydencji podatkowej." no="Nie posiadam" yes="Posiadam" value={tri.taxResidency} onChange={(v) => setTri('taxResidency', v)} />
          {tri.taxResidency === 'yes' && <div className={detail}><Period from={st.taxResidencyFrom} to={st.taxResidencyTo} onFrom={(v) => set('taxResidencyFrom', v)} onTo={(v) => set('taxResidencyTo', v)} /></div>}
        </div>

        <div>
          <Choice legend="12. Limit kosztów autorskich zastosowanych w bieżącym roku ograniczenia rocznego." no="nie przekracza" yes="przekracza" value={tri.authorCostsExceeded} onChange={(v) => setTri('authorCostsExceeded', v)} />
          <div className="mt-3">{text('authorCostsApplied', 'Dotychczas zastosowano (kwota)', { hint: 'Jeśli nic nie zastosowano, wpisz 0,00.', maxLength: 30 })}</div>
        </div>
      </div>
    </div>
  );
}
