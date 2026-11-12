import { EMAIL_RE, MAX_EMAIL_LENGTH, isValidPlIban, normalizeIban } from '../../../shared/validation.js';

export type AgreementKind = 'volunteer' | 'mandate';

export const MAX_KRK_BYTES = 2 * 1024 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Result<T> = { data: T } | { error: string };
const fail = (error: string) => ({ error });

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => (value !== null && typeof value === 'object' ? (value as Obj) : {});
const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isIsoDate = (value: string) => DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const lenIn = (value: string, min: number, max: number) => value.length >= min && value.length <= max;

// --- PESEL i wiek ----------------------------------------------------------------------------------

/** Suma kontrolna PESEL (wagi 1-3-7-9) oraz poprawna data urodzenia zakodowana w numerze. */
export function birthDateFromPesel(pesel: string): string | null {
  if (!/^\d{11}$/.test(pesel)) return null;

  const digits = [...pesel].map(Number);
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = weights.reduce((acc, w, i) => acc + w * (digits[i] ?? 0), 0);
  if ((10 - (sum % 10)) % 10 !== digits[10]) return null;

  const yy = Number(pesel.slice(0, 2));
  let mm = Number(pesel.slice(2, 4));
  const dd = Number(pesel.slice(4, 6));
  const century = [1900, 2000, 2100, 2200, 1800][Math.floor(mm / 20)];
  if (century === undefined) return null;
  mm %= 20;

  const year = century + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
  return date.toISOString().slice(0, 10);
}

/** Pełne lata ukończone w podanym dniu. */
export function ageOn(birthDate: string, today = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age -= 1;
  return age;
}

export const isAdult = (birthDate: string, today = new Date()) => ageOn(birthDate, today) >= 18;

/**
 * Dolna granica wieku wolontariusza. Wartość domyślna (13) jest ostrożnym założeniem - potwierdź ją z prawnikiem
 * i w razie potrzeby zmień zmienną AGREEMENTS_MIN_VOLUNTEER_AGE.
 */
export const minVolunteerAge = () => {
  const v = Number(process.env.AGREEMENTS_MIN_VOLUNTEER_AGE);
  return Number.isInteger(v) && v >= 0 && v < 18 ? v : 13;
};

// --- zgłoszenie ------------------------------------------------------------------------------------

export type Guardian = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relation: 'rodzic' | 'opiekun prawny';
};

export type Application = {
  kind: AgreementKind;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  pesel: string;
  birthDate: string;
  isMinor: boolean;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  note: string | null;
  guardian: Guardian | null;
};

export function validateApplication(input: unknown, today = new Date()): Result<Application> {
  const body = obj(input);
  const kind = body.kind;
  if (kind !== 'volunteer' && kind !== 'mandate') return fail('Wybierz rodzaj współpracy.');

  const firstName = str(body.firstName);
  const lastName = str(body.lastName);
  if (!lenIn(firstName, 1, 100)) return fail('Podaj imię (maks. 100 znaków).');
  if (!lenIn(lastName, 1, 100)) return fail('Podaj nazwisko (maks. 100 znaków).');

  const email = str(body.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LENGTH) return fail('Podaj poprawny adres e-mail.');

  const phone = str(body.phone).replaceAll(/[^\d+ ]/g, '');
  if (phone && !lenIn(phone, 5, 30)) return fail('Podaj poprawny numer telefonu.');

  const pesel = str(body.pesel).replaceAll(/\s/g, '');
  const birthDate = birthDateFromPesel(pesel);
  if (!birthDate) return fail('Podaj poprawny numer PESEL.');

  const age = ageOn(birthDate, today);
  const isMinor = age < 18;
  let guardian: Guardian | null = null;

  if (isMinor) {
    if (kind === 'mandate') return fail('Umowa zlecenie jest dostępna wyłącznie dla osób pełnoletnich.');
    if (age < minVolunteerAge()) return fail(`Wolontariuszem może być osoba, która ukończyła ${minVolunteerAge()} lat. W sprawie młodszej osoby napisz do fundacji.`);

    const g = obj(body.guardian);
    const gFirst = str(g.firstName);
    const gLast = str(g.lastName);
    const gEmail = str(g.email).toLowerCase();
    const gPhone = str(g.phone).replaceAll(/[^\d+ ]/g, '');
    if (!lenIn(gFirst, 1, 100) || !lenIn(gLast, 1, 100)) return fail('Podaj imię i nazwisko rodzica lub opiekuna prawnego.');
    if (!EMAIL_RE.test(gEmail) || gEmail.length > MAX_EMAIL_LENGTH) return fail('Podaj poprawny adres e-mail rodzica lub opiekuna prawnego.');
    if (!lenIn(gPhone, 5, 30)) return fail('Podaj numer telefonu rodzica lub opiekuna prawnego.');
    if (g.relation !== 'rodzic' && g.relation !== 'opiekun prawny') return fail('Wskaż, czy zgodę składa rodzic, czy opiekun prawny.');
    guardian = { firstName: gFirst, lastName: gLast, email: gEmail, phone: gPhone, relation: g.relation };
  }

  const street = str(body.street);
  const houseNumber = str(body.houseNumber);
  const postalCode = str(body.postalCode);
  const city = str(body.city);
  if (!lenIn(street, 1, 150)) return fail('Podaj ulicę.');
  if (!lenIn(houseNumber, 1, 20)) return fail('Podaj numer domu lub lokalu.');
  if (!/^\d{2}-\d{3}$/.test(postalCode)) return fail('Podaj kod pocztowy w formacie 00-000.');
  if (!lenIn(city, 1, 100)) return fail('Podaj miejscowość.');

  const note = str(body.note);
  if (note.length > 1000) return fail('Opis może mieć maksymalnie 1000 znaków.');

  return {
    data: { kind, firstName, lastName, email, phone: phone || null, pesel, birthDate, isMinor, street, houseNumber, postalCode, city, note: note || null, guardian },
  };
}

// --- warunki ustalane przez administratora ---------------------------------------------------------

export type Terms = {
  conclusionPlace: string;
  scope: string;
  startDate: string;
  endDate: string | null;
  minorsChecksRequired: boolean;
  repName: string;
  repRole: string;
  repEmail: string;
  rep2Name: string;
  rep2Role: string;
  rep2Email: string;
  contractNumber: string | null;
  rateGrosze: number | null;
  costsDescription: string | null;
  costsDays: number | null;
  healthInsuranceDays: number | null;
};

const intIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function validateTerms(kind: AgreementKind, isMinor: boolean, input: unknown): Result<Terms> {
  const body = obj(input);
  const conclusionPlace = str(body.conclusionPlace);
  if (!lenIn(conclusionPlace, 2, 100)) return fail('Podaj miejscowość zawarcia umowy.');

  const scope = str(body.scope);
  if (!lenIn(scope, 3, 1000)) return fail('Opisz zakres zadań (3-1000 znaków).');

  const startDate = str(body.startDate);
  if (!isIsoDate(startDate)) return fail('Podaj datę rozpoczęcia.');
  const endDate = str(body.endDate) || null;
  if (kind === 'mandate' && !endDate) return fail('Dla umowy zlecenie podaj datę zakończenia.');
  if (endDate && (!isIsoDate(endDate) || endDate < startDate)) return fail('Data zakończenia nie może być wcześniejsza niż rozpoczęcia.');

  const minorsChecksRequired = body.minorsChecksRequired === true;
  if (minorsChecksRequired && isMinor) return fail('Informacji o niekaralności nie zbiera się od osób małoletnich.');

  const repName = str(body.repName); const repRole = str(body.repRole); const repEmail = str(body.repEmail).toLowerCase();
  const rep2Name = str(body.rep2Name); const rep2Role = str(body.rep2Role); const rep2Email = str(body.rep2Email).toLowerCase();
  if (!lenIn(repName, 3, 150) || !lenIn(rep2Name, 3, 150)) return fail('Podaj dwie osoby reprezentujące fundację.');
  if (!lenIn(repRole, 2, 100) || !lenIn(rep2Role, 2, 100)) return fail('Podaj funkcje obu osób reprezentujących fundację.');
  if (!EMAIL_RE.test(repEmail) || !EMAIL_RE.test(rep2Email)) return fail('Podaj adresy e-mail kont administratora obu osób.');
  if (repEmail === rep2Email || repName.toLowerCase() === rep2Name.toLowerCase()) return fail('Podpisują dwie różne osoby.');

  const base = {
    conclusionPlace, scope, startDate, endDate, minorsChecksRequired, repName, repRole, repEmail, rep2Name, rep2Role, rep2Email,
  };

  if (kind === 'volunteer') {
    const costsDescription = str(body.costsDescription);
    if (!lenIn(costsDescription, 3, 500)) return fail('Opisz, w jaki sposób fundacja pokrywa koszty wolontariusza (§ 5 ust. 1).');
    if (!intIn(body.costsDays, 1, 90)) return fail('Termin przedłożenia rachunku (§ 5 ust. 3): liczba dni od 1 do 90.');
    if (!intIn(body.healthInsuranceDays, 0, 90)) return fail('Termin zapewnienia ubezpieczenia zdrowotnego (§ 7): liczba dni od 0 do 90.');
    return {
      data: { ...base, contractNumber: null, rateGrosze: null, costsDescription, costsDays: body.costsDays, healthInsuranceDays: body.healthInsuranceDays },
    };
  }

  const contractNumber = str(body.contractNumber);
  if (!lenIn(contractNumber, 1, 40)) return fail('Podaj numer umowy zlecenia.');
  if (!intIn(body.rateGrosze, 1, 100_000_000)) return fail('Podaj stawkę godzinową (grosze, do 1 000 000 zł).');

  // Stawka minimalna zmienia się co roku, więc nie ma jej w kodzie - administrator ustawia ją w środowisku.
  const min = Number(process.env.MIN_HOURLY_RATE_GROSZE);
  if (Number.isFinite(min) && min > 0 && body.rateGrosze < min) {
    return fail(`Stawka godzinowa jest niższa od ustawionego minimum (${(min / 100).toFixed(2).replace('.', ',')} zł).`);
  }
  return { data: { ...base, contractNumber, rateGrosze: body.rateGrosze, costsDescription: null, costsDays: null, healthInsuranceDays: null } };
}

// --- zgody i oświadczenia użytkownika --------------------------------------------------------------

export type ContractorStatement = {
  postOffice: string; gmina: string; powiat: string; voivodeship: string;
  taxOffice: string; nfzBranch: string; iban: string;
  employed: boolean; employedFrom: string; employedTo: string; employedSalary: 'min' | 'below' | '';
  leave: boolean; leaveType: 'unpaid' | 'parental' | 'maternity' | ''; leaveFrom: string; leaveTo: string;
  otherContract: boolean; otherContractFrom: string; otherContractTo: string; otherContractExceeds: boolean | null;
  otherTitle: boolean; otherTitleText: string;
  pensioner: boolean; pensionDecision: string;
  disability: boolean; disabilityDegree: 'lekki' | 'umiarkowany' | 'znaczny' | ''; disabilityFrom: string; disabilityTo: string;
  student: boolean; unemployed: boolean; otherInsurance: boolean;
  voluntarySickness: boolean; voluntaryPension: boolean;
  pitExemption: boolean;
  taxResidency: boolean; taxResidencyFrom: string; taxResidencyTo: string;
  authorCostsExceeded: boolean; authorCostsApplied: string;
};

const bool = (v: unknown): v is boolean => typeof v === 'boolean';

/** Zwraca `value`, jeśli należy do `allowed`, w przeciwnym razie pusty ciąg. */
const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | '' => allowed.find((a) => a === value) ?? '';

const FLAGS = [
  'employed', 'leave', 'otherContract', 'otherTitle', 'pensioner', 'disability', 'student', 'unemployed', 'otherInsurance',
  'voluntarySickness', 'voluntaryPension', 'pitExemption', 'taxResidency', 'authorCostsExceeded',
] as const;

export function validateStatement(input: unknown): Result<ContractorStatement> {
  const body = obj(input);
  const text = (key: string, min: number, max: number, label: string): string | { error: string } => {
    const v = str(body[key]);
    return lenIn(v, min, max) ? v : { error: `${label}: ${min}-${max} znaków.` };
  };
  const textFields = {
    postOffice: text('postOffice', 2, 100, 'Poczta'), gmina: text('gmina', 2, 100, 'Gmina'), powiat: text('powiat', 2, 100, 'Powiat'),
    voivodeship: text('voivodeship', 2, 100, 'Województwo'), taxOffice: text('taxOffice', 2, 150, 'Urząd skarbowy'), nfzBranch: text('nfzBranch', 2, 100, 'Oddział NFZ'),
  };
  for (const v of Object.values(textFields)) if (typeof v !== 'string') return fail(v.error);
  const t = textFields as Record<keyof typeof textFields, string>;

  const iban = normalizeIban(str(body.iban));
  if (!isValidPlIban(iban)) return fail('Podaj poprawny polski numer konta (26 cyfr).');

  for (const key of FLAGS) if (!bool(body[key])) return fail('Odpowiedz na wszystkie punkty oświadczenia.');
  const f = body as Record<(typeof FLAGS)[number], boolean>;

  const period = (on: boolean, fromKey: string, toKey: string, label: string): Result<[string, string]> => {
    if (!on) return { data: ['', ''] };
    const from = str(body[fromKey]); const to = str(body[toKey]);
    if (!isIsoDate(from) || !isIsoDate(to)) return fail(`${label}: podaj daty od i do.`);
    if (to < from) return fail(`${label}: data końca nie może być wcześniejsza niż początku.`);
    return { data: [from, to] };
  };

  const employed = period(f.employed, 'employedFrom', 'employedTo', 'Zatrudnienie (pkt 1)'); if ('error' in employed) return employed;
  const employedSalary = pick(body.employedSalary, ['min', 'below'] as const);
  if (f.employed && !employedSalary) return fail('Zatrudnienie (pkt 1): wskaż wysokość wynagrodzenia.');

  const leave = period(f.leave, 'leaveFrom', 'leaveTo', 'Urlop (pkt 2)'); if ('error' in leave) return leave;
  const leaveType = pick(body.leaveType, ['unpaid', 'parental', 'maternity'] as const);
  if (f.leave && !leaveType) return fail('Urlop (pkt 2): wskaż rodzaj urlopu.');

  const other = period(f.otherContract, 'otherContractFrom', 'otherContractTo', 'Inna umowa (pkt 3)'); if ('error' in other) return other;
  const otherContractExceeds = bool(body.otherContractExceeds) ? body.otherContractExceeds : null;
  if (f.otherContract && otherContractExceeds === null) return fail('Inna umowa (pkt 3): wskaż, czy wynagrodzenie przekracza minimalne.');

  const otherTitleText = str(body.otherTitleText);
  if (f.otherTitle && !lenIn(otherTitleText, 2, 150)) return fail('Pkt 4: podaj tytuł do ubezpieczenia.');
  const pensionDecision = str(body.pensionDecision);
  if (f.pensioner && !lenIn(pensionDecision, 2, 100)) return fail('Pkt 5: podaj numer decyzji ZUS i datę jej przyznania.');

  const disability = period(f.disability, 'disabilityFrom', 'disabilityTo', 'Niepełnosprawność (pkt 6)'); if ('error' in disability) return disability;
  const disabilityDegree = pick(body.disabilityDegree, ['lekki', 'umiarkowany', 'znaczny'] as const);
  if (f.disability && !disabilityDegree) return fail('Pkt 6: wskaż stopień niepełnosprawności.');

  const residency = period(f.taxResidency, 'taxResidencyFrom', 'taxResidencyTo', 'Certyfikat rezydencji (pkt 11)'); if ('error' in residency) return residency;

  const authorCostsApplied = str(body.authorCostsApplied);
  if (!lenIn(authorCostsApplied, 1, 30)) return fail('Pkt 12: podaj kwotę dotychczas zastosowanych kosztów autorskich (np. 0,00).');
  if (body.truthful !== true) return fail('Potwierdź prawdziwość danych w oświadczeniu.');

  return {
    data: {
      ...t, iban,
      employed: f.employed, employedFrom: employed.data[0], employedTo: employed.data[1], employedSalary: f.employed ? employedSalary : '',
      leave: f.leave, leaveType: f.leave ? leaveType : '', leaveFrom: leave.data[0], leaveTo: leave.data[1],
      otherContract: f.otherContract, otherContractFrom: other.data[0], otherContractTo: other.data[1], otherContractExceeds: f.otherContract ? otherContractExceeds : null,
      otherTitle: f.otherTitle, otherTitleText: f.otherTitle ? otherTitleText : '',
      pensioner: f.pensioner, pensionDecision: f.pensioner ? pensionDecision : '',
      disability: f.disability, disabilityDegree: f.disability ? disabilityDegree : '', disabilityFrom: disability.data[0], disabilityTo: disability.data[1],
      student: f.student, unemployed: f.unemployed, otherInsurance: f.otherInsurance,
      voluntarySickness: f.voluntarySickness, voluntaryPension: f.voluntaryPension, pitExemption: f.pitExemption,
      taxResidency: f.taxResidency, taxResidencyFrom: residency.data[0], taxResidencyTo: residency.data[1],
      authorCostsExceeded: f.authorCostsExceeded, authorCostsApplied,
    },
  };
}

/** Oświadczenia z „Zgody wolontariackiej”: wszystkie trzy są warunkiem udziału. */
export function validateDeclarations(input: unknown): Result<{ participation: true; rules: true; health: true }> {
  const d = obj(obj(input).declarations);
  if (d.participation !== true || d.rules !== true || d.health !== true) {
    return fail('Zaznacz wszystkie oświadczenia: zgodę na udział, zapoznanie z regulaminem oraz brak przeciwwskazań zdrowotnych.');
  }
  return { data: { participation: true, rules: true, health: true } };
}

/** Dekoduje plik KRK z base64 i sprawdza rozmiar oraz nagłówek PDF. */
export function decodeKrkFile(value: unknown): Result<Buffer> {
  if (typeof value !== 'string' || !value) return fail('Dołącz plik KRK w formacie PDF.');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_KRK_BYTES) return fail('Plik KRK może mieć maksymalnie 2 MB.');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return fail('Plik KRK musi być dokumentem PDF.');
  return { data: bytes };
}

export function validateKrkDate(value: unknown, today = new Date()): Result<string> {
  const date = str(value);
  if (!isIsoDate(date)) return fail('Podaj datę wystawienia zaświadczenia z KRK.');
  if (date > today.toISOString().slice(0, 10)) return fail('Data wystawienia zaświadczenia z KRK nie może być z przyszłości.');
  return { data: date };
}
