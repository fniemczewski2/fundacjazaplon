// src/lib/agreements.ts
import { supabase } from './supabase';
import { EMAIL_RE, formatIban, isValidPlIban, normalizeIban } from './settlements';

export { formatIban, isValidPlIban, normalizeIban };

export type AgreementKind = 'volunteer' | 'mandate';
export type AgreementStatus = 'submitted' | 'approved' | 'rejected' | 'signed' | 'completed';

export const KIND_LABEL: Record<AgreementKind, string> = { volunteer: 'Wolontariat', mandate: 'Umowa zlecenie' };
export const MAX_KRK_MB = 2;

// --- PESEL (kopia reguł z serwera; serwer i tak waliduje ponownie) --------------------------------

export function birthDateFromPesel(pesel: string): string | null {
  if (!/^\d{11}$/.test(pesel)) return null;
  const d = [...pesel].map(Number);
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = w.reduce((acc, x, i) => acc + x * (d[i] ?? 0), 0);
  if ((10 - (sum % 10)) % 10 !== d[10]) return null;

  let mm = Number(pesel.slice(2, 4));
  const century = [1900, 2000, 2100, 2200, 1800][Math.floor(mm / 20)];
  if (century === undefined) return null;
  mm %= 20;
  const year = century + Number(pesel.slice(0, 2));
  const dd = Number(pesel.slice(4, 6));
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
  return date.toISOString().slice(0, 10);
}

export function ageFromPesel(pesel: string, today = new Date()): number | null {
  const birth = birthDateFromPesel(pesel.replaceAll(/\s/g, ''));
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number) as [number, number, number];
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age -= 1;
  return age;
}

/** Podpowiedź w formularzu; wiążąca dolna granica wieku jest sprawdzana na serwerze (domyślnie 13 lat). */
export const MIN_VOLUNTEER_AGE_HINT = 13;

// --- zgłoszenie -----------------------------------------------------------------------------------

export type Relation = 'rodzic' | 'opiekun prawny';

export type GuardianInput = { firstName: string; lastName: string; email: string; phone: string; relation: Relation | '' };

export type ApplicationInput = {
  kind: AgreementKind;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pesel: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  note: string;
  guardian: GuardianInput;
};

export type ApplicationErrors = Partial<Record<Exclude<keyof ApplicationInput, 'kind' | 'guardian'> | 'guardianFirstName' | 'guardianLastName' | 'guardianEmail' | 'guardianPhone' | 'guardianRelation', string>>;

export function validateApplication(i: ApplicationInput): ApplicationErrors {
  const e: ApplicationErrors = {};
  if (!i.firstName.trim()) e.firstName = 'Podaj imię.';
  if (!i.lastName.trim()) e.lastName = 'Podaj nazwisko.';
  if (!EMAIL_RE.test(i.email.trim())) e.email = 'Podaj poprawny adres e-mail.';

  const phone = i.phone.replaceAll(/[^\d+ ]/g, '');
  if (phone && (phone.length < 5 || phone.length > 30)) e.phone = 'Podaj poprawny numer telefonu.';

  const age = ageFromPesel(i.pesel);
  if (age === null) e.pesel = 'Podaj poprawny numer PESEL.';
  else if (age < 18 && i.kind === 'mandate') e.pesel = 'Umowa zlecenie jest dostępna wyłącznie dla osób pełnoletnich.';
  else if (age < MIN_VOLUNTEER_AGE_HINT) e.pesel = `Wolontariuszem może być osoba, która ukończyła ${MIN_VOLUNTEER_AGE_HINT} lat. W sprawie młodszej osoby napisz do fundacji.`;

  if (age !== null && age < 18) {
    const g = i.guardian;
    if (!g.firstName.trim()) e.guardianFirstName = 'Podaj imię rodzica lub opiekuna.';
    if (!g.lastName.trim()) e.guardianLastName = 'Podaj nazwisko rodzica lub opiekuna.';
    if (!EMAIL_RE.test(g.email.trim())) e.guardianEmail = 'Podaj poprawny adres e-mail rodzica lub opiekuna.';
    if (g.phone.replaceAll(/[^\d+ ]/g, '').length < 5) e.guardianPhone = 'Podaj numer telefonu rodzica lub opiekuna.';
    if (!g.relation) e.guardianRelation = 'Wskaż, kim jest osoba składająca zgodę.';
  }

  if (!i.street.trim()) e.street = 'Podaj ulicę.';
  if (!i.houseNumber.trim()) e.houseNumber = 'Podaj numer domu lub lokalu.';
  if (!/^\d{2}-\d{3}$/.test(i.postalCode.trim())) e.postalCode = 'Kod w formacie 00-000.';
  if (!i.city.trim()) e.city = 'Podaj miejscowość.';
  if (i.note.length > 1000) e.note = 'Maksymalnie 1000 znaków.';
  return e;
}

// --- komunikacja z API ----------------------------------------------------------------------------

async function parseError(response: Response): Promise<string> {
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (data?.error) return data.error;
  }
  return `Serwer odpowiedział błędem (${response.status}).`;
}

async function postJson<T>(url: string, payload: unknown, token?: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
}

async function postBlob(url: string, payload: unknown, token?: string): Promise<Blob> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.blob();
}

export async function submitApplication(input: ApplicationInput, website: string): Promise<void> {
  const age = ageFromPesel(input.pesel);
  const { guardian, ...rest } = input;
  await postJson('/api/agreement-public', {
    action: 'submit', ...rest, pesel: input.pesel.replaceAll(/\s/g, ''), email: input.email.trim(),
    ...(age !== null && age < 18 ? { guardian } : {}), website,
  });
}

// --- strona publiczna (po tokenie) ----------------------------------------------------------------

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

export type Declarations = { participation: boolean; rules: boolean; health: boolean };

export type PublicView = {
  kind: AgreementKind;
  status: AgreementStatus;
  isMinor: boolean;
  firstName: string;
  lastName: string;
  signerName: string;
  guardianRelation: Relation | null;
  emailMasked: string;
  scope: string | null;
  startDate: string | null;
  endDate: string | null;
  contractNumber: string | null;
  rateGrosze: number | null;
  costsDescription: string | null;
  costsDays: number | null;
  healthInsuranceDays: number | null;
  minorsChecksRequired: boolean;
  street: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  email: string;
  consentsSaved: boolean;
  consentImage: boolean | null;
  consentRspts: boolean | null;
  marketingConsent: boolean | null;
  declarations: Declarations | null;
  statement: ContractorStatement | null;
  krkUploaded: boolean;
  krkIssueDate: string | null;
  otpSentAt: string | null;
  signedAt: string | null;
  countersignedAt: string | null;
  templatesApproved: boolean;
};

export type ConsentsInput = {
  infoClauseAck: boolean;
  marketingConsent: boolean;
  consentImage?: boolean;
  declarations?: Declarations;
  consentRspts?: boolean;
  krkIssueDate?: string;
  krkFileBase64?: string;
  statement?: ContractorStatement & { truthful: boolean };
};

export const EMPTY_STATEMENT: ContractorStatement = {
  postOffice: '', gmina: '', powiat: '', voivodeship: '', taxOffice: '', nfzBranch: '', iban: '',
  employed: false, employedFrom: '', employedTo: '', employedSalary: '',
  leave: false, leaveType: '', leaveFrom: '', leaveTo: '',
  otherContract: false, otherContractFrom: '', otherContractTo: '', otherContractExceeds: null,
  otherTitle: false, otherTitleText: '', pensioner: false, pensionDecision: '',
  disability: false, disabilityDegree: '', disabilityFrom: '', disabilityTo: '',
  student: false, unemployed: false, otherInsurance: false, voluntarySickness: false, voluntaryPension: false,
  pitExemption: false, taxResidency: false, taxResidencyFrom: '', taxResidencyTo: '', authorCostsExceeded: false, authorCostsApplied: '',
};

export const publicGet = (token: string) => postJson<PublicView>('/api/agreement-public', { action: 'get', token });
export const publicPreview = (token: string) => postBlob('/api/agreement-public', { action: 'preview', token });
export const publicSave = (token: string, consents: ConsentsInput) =>
  postJson<{ ok: true }>('/api/agreement-public', { action: 'save', token, ...consents });
export const publicSendCode = (token: string) => postJson<{ ok: true }>('/api/agreement-public', { action: 'otp', token });
export const publicSign = (token: string, code: string) =>
  postJson<{ ok: true }>('/api/agreement-public', { action: 'sign', token, code, accept: true });

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Nie udało się wczytać pliku.'));
    reader.readAsDataURL(file);
  });
}

// --- panel administratora -------------------------------------------------------------------------

export type AgreementRow = {
  id: string;
  created_at: string;
  kind: AgreementKind;
  status: AgreementStatus;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  pesel: string;
  street: string;
  house_number: string | null;
  postal_code: string;
  city: string;
  note: string | null;
  is_minor: boolean;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_relation: Relation | null;
  conclusion_place: string | null;
  contract_number: string | null;
  scope: string | null;
  start_date: string | null;
  end_date: string | null;
  rate_grosze: number | null;
  costs_description: string | null;
  costs_days: number | null;
  health_insurance_days: number | null;
  minors_checks_required: boolean;
  rep_name: string | null;
  rep_role: string | null;
  rep_email: string | null;
  rep2_name: string | null;
  rep2_role: string | null;
  rep2_email: string | null;
  decided_by: string | null;
  decision_note: string | null;
  consents_saved_at: string | null;
  consent_image: boolean | null;
  consent_rspts: boolean | null;
  krk_file_path: string | null;
  krk_issue_date: string | null;
  krk_verified_at: string | null;
  krk_file_deleted_at: string | null;
  rspts_verified_at: string | null;
  signed_at: string | null;
  cosign1_at: string | null;
  cosign1_by: string | null;
  cosign2_at: string | null;
  cosign2_by: string | null;
  countersigned_at: string | null;
  signed_file_path: string | null;
  template_approved: boolean | null;
  last_email_error: string | null;
};

export type AgreementEvent = { id: number; at: string; actor: string; event: string };

export type AdminAction =
  | 'approve' | 'reject' | 'resend-link' | 'verify-krk' | 'verify-rspts' | 'delete-krk' | 'cosign';

export type AdminResult = { emailSent?: boolean; emailError?: string; link?: string; completed?: boolean; waitingFor?: string };

export type TermsInput = {
  conclusionPlace: string;
  scope: string;
  startDate: string;
  endDate: string;
  minorsChecksRequired: boolean;
  repName: string;
  repRole: string;
  repEmail: string;
  rep2Name: string;
  rep2Role: string;
  rep2Email: string;
  contractNumber?: string;
  rateGrosze?: number;
  costsDescription?: string;
  costsDays?: number;
  healthInsuranceDays?: number;
};

export const formatPln = (grosze: number) =>
  (grosze / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

/** "1 234,56" -> 123456 (grosze); null przy błędnym formacie. */
export function parseAmountToGrosze(value: string): number | null {
  const s = value.replaceAll(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [zl, gr = ''] = s.split('.');
  return Number(zl) * 100 + Number(gr.padEnd(2, '0'));
}

export async function listAgreements(): Promise<AgreementRow[]> {
  const { data, error } = await supabase.from('agreements').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data as AgreementRow[]) ?? [];
}

export async function listEvents(id: string): Promise<AgreementEvent[]> {
  const { data, error } = await supabase.from('agreement_events').select('id, at, actor, event').eq('agreement_id', id).order('at');
  if (error) throw new Error(error.message);
  return (data as AgreementEvent[]) ?? [];
}

export async function getKrkUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('agreements').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Nie udało się pobrać pliku.');
  return data.signedUrl;
}

async function adminToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  return token;
}

export async function adminAction(id: string, action: AdminAction, extra: Record<string, unknown> = {}): Promise<AdminResult> {
  return postJson<AdminResult>('/api/agreement-admin', { id, action, ...extra }, await adminToken());
}

export async function adminPreview(id: string): Promise<Blob> {
  return postBlob('/api/agreement-admin', { id, action: 'preview' }, await adminToken());
}
