import pdfmake from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  LOGO_SVG, NOTOSERIF_BOLD_B64, NOTOSERIF_EXTRABOLD_B64, NOTOSERIF_REGULAR_B64,
  SIGNIKA_BOLD_B64, SIGNIKA_MEDIUM_B64, SIGNIKA_REGULAR_B64,
} from './assets.js';
import { plnInWords } from './polish.js';
import { sha256Hex } from './security.js';
import type { AgreementKind, ContractorStatement } from './validate.js';

/**
 * Pakiet dokumentów na papierze firmowym Fundacji „Zapłon”, odtworzony ze wzorów fundacji (czcionki Signika i
 * Noto Serif, logo w prawym górnym rogu pierwszej strony dokumentu, paragrafy wyśrodkowane, kropkowane pola,
 * numeracja „n z N”):
 *  - wolontariat: porozumienie + Zgoda wolontariacka (wersja dla osoby pełnoletniej albo dla rodzica/opiekuna),
 *  - zlecenie: umowa + Rachunek (załącznik nr 1) + Oświadczenie zleceniobiorcy,
 *  - oświadczenie dotyczące ochrony małoletnich (gdy współpraca obejmuje kontakt z małoletnimi),
 *  - Karta podpisów.
 *
 * UWAGA: treści prawne pochodzą ze wzorów fundacji z poprawkami wymienionymi w przeglądzie zgodności. Do czasu
 * ustawienia AGREEMENTS_TEMPLATES_APPROVED=true (po przeglądzie prawnika i IOD) każda strona ma znak wodny
 * „WERSJA ROBOCZA”.
 */
export const TEMPLATE_VERSION = '2026-10-wzory-fundacji-1';

export const templatesApproved = () => process.env.AGREEMENTS_TEMPLATES_APPROVED === 'true';

export type Foundation = {
  name: string; address: string; krs: string; nip: string; regon: string; email: string; phone: string; website: string;
};

// Dane z publicznego znacznika NGO w index.html. Nadpisywane wierszem contact_info z bazy.
export const DEFAULT_FOUNDATION: Foundation = {
  name: 'Fundacja „Zapłon”',
  address: 'Baranówku 19B, 62-050 Mosina',
  krs: '0001178189',
  nip: '7773448597',
  regon: '541978238',
  email: 'biuro@zaplon.org.pl',
  phone: '+48 783 008 255',
  website: 'https://zaplon.org.pl',
};

export function foundationFromContact(row: Record<string, unknown> | null | undefined): Foundation {
  const pick = (key: string, fallback: string) => {
    const value = row?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  };
  return {
    ...DEFAULT_FOUNDATION,
    krs: pick('krs', DEFAULT_FOUNDATION.krs), nip: pick('nip', DEFAULT_FOUNDATION.nip), regon: pick('regon', DEFAULT_FOUNDATION.regon),
    email: pick('email', DEFAULT_FOUNDATION.email), phone: pick('phone', DEFAULT_FOUNDATION.phone),
  };
}

export type Declarations = { participation?: boolean; rules?: boolean; health?: boolean };

export type AgreementRow = {
  id: string;
  kind: AgreementKind;
  first_name: string;
  last_name: string;
  email: string;
  pesel: string;
  birth_date: string;
  street: string;
  house_number: string | null;
  postal_code: string;
  city: string;
  is_minor: boolean;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_relation: 'rodzic' | 'opiekun prawny' | null;
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
  rep2_name: string | null;
  rep2_role: string | null;
  consent_image: boolean | null;
  consent_rspts: boolean | null;
  marketing_consent: boolean | null;
  declarations: Declarations | null;
  info_clause_ack_at: string | null;
  contractor_statement: ContractorStatement | null;
  krk_issue_date: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  cosign1_at: string | null;
  cosign1_by: string | null;
  cosign2_at: string | null;
  cosign2_by: string | null;
  countersigned_at: string | null;
};

// --- formatowanie ----------------------------------------------------------------------------------

const TZ = 'Europe/Warsaw';
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso));
export const formatPln = (grosze: number) =>
  `${(grosze / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
const formatIban = (iban: string) => iban.replaceAll(/(.{4})/g, '$1 ').trim();

const COLORS = { text: '#000000', muted: '#555555', danger: '#b3261e', signed: '#194770' };
const SERIF = 'Serif';
const HEAD = 'Head';

// --- skrót treści ----------------------------------------------------------------------------------

/** Skrót danych, na których opiera się dokument. Zapisywany przy podpisie i sprawdzany przy kontrasygnacie. */
export function contentHash(r: AgreementRow, f: Foundation): string {
  return sha256Hex(
    JSON.stringify({
      v: TEMPLATE_VERSION,
      id: r.id, kind: r.kind,
      party: [r.first_name, r.last_name, r.email, r.pesel, r.birth_date, r.street, r.house_number, r.postal_code, r.city, r.is_minor, r.guardian_first_name, r.guardian_last_name, r.guardian_relation],
      terms: [r.conclusion_place, r.contract_number, r.scope, r.start_date, r.end_date, r.rate_grosze, r.costs_description, r.costs_days, r.health_insurance_days, r.minors_checks_required, r.rep_name, r.rep_role, r.rep2_name, r.rep2_role],
      consents: [r.consent_image, r.consent_rspts, r.marketing_consent, r.declarations, r.info_clause_ack_at, r.contractor_statement, r.krk_issue_date],
      foundation: [f.name, f.address, f.krs, f.nip, f.regon],
    }),
  );
}

// --- elementy układu (jak we wzorach) --------------------------------------------------------------

/** Wartość wpisana w pole formularza: pogrubiona, na kropkowanej linii. Puste pole = kropkowana linia. */
const val = (value: string | number | null | undefined, blank = 18): Content => {
  const text = value === null || value === undefined || String(value).trim() === '' ? ' '.repeat(blank) : String(value);
  return { text, font: SERIF, bold: true, decoration: 'underline', decorationStyle: 'dotted' };
};
const b = (text: string): Content => ({ text, bold: true });

const titleBlock = (title: string | Content[], first: boolean, subtitle?: string): Content[] => [
  ...(first ? [] : [{ text: '', pageBreak: 'before' as const, fontSize: 1, margin: [0, 0, 0, 0] as [number, number, number, number] }]),
  {
    columns: [
      {
        width: '*', margin: [0, 10, 0, 0],
        stack: [
          { text: title as any, font: HEAD, bold: true, fontSize: 28, lineHeight: 1.0 },
          ...(subtitle ? [{ text: subtitle, font: HEAD, bold: true, fontSize: 18, lineHeight: 1.1, margin: [0, 4, 0, 0] as [number, number, number, number] }] : []),
        ],
      },
      { width: 131, svg: LOGO_SVG },
    ],
    columnGap: 12, margin: [0, 0, 0, 22],
  },
];

const heading = (text: string, margin: [number, number, number, number] = [0, 14, 0, 8]): Content => ({ text, font: HEAD, bold: true, fontSize: 16, margin });
const paragraph = (runs: string | Content[], extra: Record<string, unknown> = {}): Content => ({ text: runs as any, alignment: 'justify', margin: [0, 0, 0, 6], ...extra });
const paragraphNo = (n: string): Content => ({ text: n, font: 'SerifXB', fontSize: 16, alignment: 'center', margin: [0, 16, 0, 10] });
const olist = (items: Array<string | Content[]>, extra: Record<string, unknown> = {}): Content => ({
  ol: items.map((item) => (Array.isArray(item) ? { text: item } : item)) as any, alignment: 'justify', margin: [0, 0, 0, 4], ...extra,
});
const ulist = (items: Array<string | Content[]>): Content => ({
  ul: items.map((item) => (Array.isArray(item) ? { text: item } : item)) as any, alignment: 'justify', margin: [0, 0, 0, 6], markerColor: COLORS.text,
});

type Sig = { caption: string; name?: string; sub?: string; signedAt?: string | null; via?: string };

function sigCell(s: Sig): Content {
  return {
    stack: [
      s.signedAt
        ? {
            stack: [
              { text: 'Podpisano elektronicznie', font: HEAD, fontSize: 7.5, color: COLORS.signed },
              { text: s.name ?? '', font: HEAD, fontSize: 12, margin: [0, 1, 0, 0] },
              { text: `${fmtDateTime(s.signedAt)}${s.via ? `, ${s.via}` : ''}`, fontSize: 7.5, color: COLORS.muted },
            ],
            margin: [0, 0, 0, 2],
          }
        : { text: ' ', margin: [0, 0, 0, 30] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, dash: { length: 1.2, space: 1.6 }, lineColor: '#000000' }] },
      { text: s.caption, fontSize: 8, alignment: 'center', margin: [0, 2, 0, 0], width: 200 },
      ...(s.name && !s.signedAt ? [{ text: `${s.name}${s.sub ? `, ${s.sub}` : ''}`, fontSize: 7.5, color: COLORS.muted, alignment: 'center' as const, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
    ],
    width: 200,
  } as Content;
}

const signRow = (cells: Sig[]): Content => ({
  margin: [0, 26, 0, 0], unbreakable: true, columnGap: 22,
  columns: cells.map((c) => sigCell(c)),
});

const signerName = (r: AgreementRow) =>
  r.is_minor ? `${r.guardian_first_name ?? ''} ${r.guardian_last_name ?? ''}`.trim() : `${r.first_name} ${r.last_name}`;
const personName = (r: AgreementRow) => `${r.first_name} ${r.last_name}`;
const address = (r: AgreementRow) => `${r.street}${r.house_number ? ` ${r.house_number}` : ''}, ${r.postal_code} ${r.city}`;
const userVia = 'kod jednorazowy przesłany na e-mail';
const conclusionDate = (r: AgreementRow) => fmtDate(r.countersigned_at ?? r.signed_at);

const repSigs = (r: AgreementRow, captionOne: string): Sig[] => [
  { caption: captionOne, name: r.rep_name ?? '', sub: r.rep_role ?? undefined, signedAt: r.cosign1_at, via: r.cosign1_by ? 'potwierdzenie w systemie' : undefined },
  { caption: captionOne, name: r.rep2_name ?? '', sub: r.rep2_role ?? undefined, signedAt: r.cosign2_at, via: r.cosign2_by ? 'potwierdzenie w systemie' : undefined },
];

const fundacjaIntro = (r: AgreementRow, f: Foundation, word: string): Content[] => [
  paragraph([
    b(f.name), ` z siedzibą w ${f.address}, KRS nr ${f.krs}, reprezentowaną przez członków Zarządu:`,
  ]),
  olist([[val(r.rep_name), val(r.rep_role ? `, ${r.rep_role}` : '', 2)], [val(r.rep2_name), val(r.rep2_role ? `, ${r.rep2_role}` : '', 2)]], { margin: [24, 2, 0, 8] }),
  paragraph(['zwaną dalej ', b(word), ',']),
];

type Annex = { key: 'rachunek' | 'statement' | 'minors'; title: string };
function annexes(r: AgreementRow): Annex[] {
  if (r.kind === 'mandate') {
    return [
      { key: 'rachunek', title: 'Rachunek' },
      { key: 'statement', title: 'Oświadczenie zleceniobiorcy' },
      ...(r.minors_checks_required ? [{ key: 'minors' as const, title: 'Oświadczenie i zgoda dotyczące ochrony małoletnich' }] : []),
    ];
  }
  return r.minors_checks_required ? [{ key: 'minors', title: 'Oświadczenie i zgoda dotyczące ochrony małoletnich' }] : [];
}
const annexNo = (list: Annex[], key: Annex['key']) => list.findIndex((a) => a.key === key) + 1;

// --- porozumienie wolontariackie -------------------------------------------------------------------

function volunteerAgreement(r: AgreementRow, f: Foundation): Content[] {
  const volunteerParty: Content[] = r.is_minor
    ? [
        paragraph([
          b(personName(r)), ', PESEL ', val(r.pesel, 11), ', zamieszkałym/ą w ', val(address(r), 24), ', małoletnim/ą, reprezentowanym/ą przez ',
          b(signerName(r)), ` (${r.guardian_relation ?? 'rodzic / opiekun prawny'}), działającego/ą w jego/jej imieniu oraz wyrażającego/ą zgodę na zawarcie niniejszego porozumienia, zwanym/ą dalej `, b('Wolontariuszem'), '.',
        ], { alignment: 'left' }),
      ]
    : [paragraph([b(personName(r)), ', PESEL ', val(r.pesel, 11), ', zamieszkałym/ą w ', val(address(r), 24), ', zwanym/ą dalej ', b('Wolontariuszem'), '.'], { alignment: 'left' })];

  return [
    ...titleBlock('Porozumienie', true, 'o wykonywaniu świadczeń wolontariackich'),
    paragraph(['zawarte w dniu ', val(conclusionDate(r), 12), ' w miejscowości ', val(r.conclusion_place, 14), ' pomiędzy:']),
    ...fundacjaIntro(r, f, 'Fundacją').slice(0, 2),
    paragraph('zwaną dalej Fundacją, a'),
    ...volunteerParty,

    heading('Wstęp'),
    paragraph('Fundacja oświadcza, że jest podmiotem na rzecz którego zgodnie z art. 42 ust. 1 ustawy z dnia 24 kwietnia 2003 r. o działalności pożytku publicznego i o wolontariacie (Dz. U. z 2024 r. poz. 1491 z późn. zm.), zwanej dalej ustawą o działalności pożytku publicznego i o wolontariacie, mogą być wykonywane świadczenia przez wolontariuszy.'),
    paragraph('Wolontariusz oświadcza, że posiada kwalifikacje i spełnia wymagania niezbędne do wykonywania powierzonych niżej czynności.'),
    paragraph('Mając na względzie ideę wolontariatu, u podstaw której stoi dobrowolne, bezpłatne wykonywanie czynności, a także biorąc pod uwagę charytatywny, pomocniczy i uzupełniający charakter wykonywanych przez wolontariuszy świadczeń, Strony porozumienia uzgadniają, co następuje:'),

    paragraphNo('§ 1.'),
    olist([
      'Fundacja powierza wykonywanie Wolontariuszowi czynności pozostających w zakresie jej działalności statutowej albo czynności organizacyjnych z tą działalnością związanych, a Wolontariusz dobrowolnie podejmuje się wykonywania tych czynności na rzecz Fundacji lub na rzecz szkoły w rozumieniu art. 2 pkt 2 ustawy z dnia 14 grudnia 2016 r. – Prawo oświatowe (Dz. U. z 2024 r. poz. 737 z późn. zm.) lub innego podmiotu wskazanego przez Fundację (dalej nazywanego „Podmiotem Korzystającym”). Zakres czynności: ',
      'Wolontariusz zobowiązuje się wykonywać te czynności sumiennie, stosownie do posiadanej wiedzy i umiejętności.',
      'Podmiot Korzystający może określić konkretny sposób wykonywania czynności, o których mowa w ust. 1.',
      'Czynności, o których mowa w ust. 1, nie mogą nadmiernie obciążać Wolontariusza psychicznie ani fizycznie.',
    ].map((t, i) => (i === 0 ? [t, val(r.scope, 24), '.'] : t))),

    paragraphNo('§ 2.'),
    olist([
      ['Strony Porozumienia uzgadniają, że czynności określone w § 1 ust. 1 będą wykonywane w okresie od ', val(fmtDate(r.start_date), 10), r.end_date ? ' do ' : ' do czasu rozwiązania porozumienia', ...(r.end_date ? [val(fmtDate(r.end_date), 10)] : []), '.'],
      'Miejscem wykonywania czynności będzie szkoła albo inny podmiot wskazany przez Fundację.',
    ]),

    paragraphNo('§ 3.'),
    paragraph('Z uwagi na charakter i ideę wolontariatu:'),
    olist(['Wolontariusz jest obowiązany wykonywać uzgodnione czynności osobiście;', 'Wolontariusz za swoje czynności nie otrzyma wynagrodzenia.'], { type: 'lower-alpha' }),

    paragraphNo('§ 4.'),
    olist([
      'Fundacja zobowiązuje się zapewnić Wolontariuszowi bezpieczne i higieniczne warunki wykonywania przez niego świadczeń.',
      'Fundacja na czas wykonywania czynności przekazuje Wolontariuszowi stosowne środki ochrony indywidualnej, jeśli będzie to konieczne dla zachowania bezpiecznych i higienicznych warunków wykonywania czynności.',
    ]),

    paragraphNo('§ 5.'),
    olist([
      ['Fundacja zobowiązuje się pokrywać niezbędne koszty ponoszone przez Wolontariusza, związane z wykonywaniem świadczeń w następujący sposób: ', val(r.costs_description, 30), '.'],
      'Zwrot kosztów następuje na podstawie wystawionego przez Wolontariusza rachunku.',
      ['Wolontariusz zobowiązuje się do przedłożenia rachunku, o którym mowa w ust. 2, w terminie ', val(r.costs_days, 4), ' dni od dnia poniesienia kosztów.'],
    ]),

    paragraphNo('§ 6.'),
    paragraph('Fundacja ma obowiązek ubezpieczyć wolontariusza od następstw nieszczęśliwych wypadków.'),
    paragraphNo('§ 7.'),
    paragraph(['Fundacja zapewnia wolontariuszowi ubezpieczenie zdrowotne, w terminie ', val(r.health_insurance_days, 4), ' dni od dnia zawarcia Porozumienia.']),
    paragraphNo('§ 8.'),
    paragraph('Wolontariusz zobowiązuje się zachować w tajemnicy wszelkie informacje i dane osobowe dotyczące uczniów i innych osób powiązanych z Podmiotem Korzystającym, które powziął w związku i przy okazji wykonywania porozumienia.'),

    paragraphNo('§ 9.'),
    olist([
      'Wolontariusz ponosi odpowiedzialność za szkody wyrządzone Fundacji, lub Podmiotowi Korzystającemu, chyba że szkoda została wywołana okolicznościami, za które odpowiedzialność ponosi Fundacja.',
      'Wolontariusz nie ponosi odpowiedzialności za szkody, które powstały w wyniku działania siły wyższej. Wolontariusz może zwolnić się od odpowiedzialności, jeżeli wykaże, że szkoda została wywołana okolicznościami od niego niezależnymi.',
    ]),

    paragraphNo('§ 10.'),
    paragraph('Wartość świadczenia Wolontariusza nie stanowi darowizny na rzecz korzystającego w rozumieniu przepisów Ustawy z dnia 23 kwietnia 1964 r. Kodeks cywilny (t.j. Dz. U. z 2024 r. poz. 1061 z późn. zm.) oraz przepisów podatkowych.'),

    paragraphNo('§ 11.'),
    olist([
      'Porozumienie może zostać rozwiązane w każdym czasie przez każdą ze stron z zachowaniem miesięcznego okresu wypowiedzenia.',
      'Porozumienie może zostać rozwiązane przez Fundację bez zachowania okresu wypowiedzenia w razie wystąpienia okoliczności uniemożliwiających dalsze trwanie porozumienia, w szczególności z powodu:',
    ]),
    olist([
      'wydania przez lekarza orzeczenia o niezdolności Wolontariusza do pracy na czas dłuższy niż czas pracy w zakresie objętym porozumieniem;',
      'naruszenia przez Wolontariusza postanowień porozumienia;',
      'wyrządzenia przez Wolontariusza szkody Podmiotowi Korzystającemu.',
    ], { type: 'lower-alpha', margin: [24, 0, 0, 4] }),

    paragraphNo('§ 12.'),
    paragraph('W sprawach nieuregulowanych niniejszym porozumieniem stosuje się przepisy:'),
    olist(['Ustawy o działalności pożytku publicznego i o wolontariacie;', 'Kodeksu cywilnego.']),

    paragraphNo('§ 13.'),
    olist([
      'Porozumienie zostało zawarte w postaci elektronicznej, w sposób opisany w Karcie podpisów (kod jednorazowy przesłany na adres e-mail osoby podpisującej w imieniu Wolontariusza oraz potwierdzenie przez dwóch przedstawicieli Fundacji). Każda ze stron otrzymuje kopię porozumienia w postaci pliku PDF.',
      'Wszelkie zmiany niniejszego porozumienia wymagają formy pisemnej pod rygorem nieważności.',
      'Wszelkie spory wynikłe na tle realizacji niniejszego porozumienia strony zobowiązują się rozstrzygać polubownie. W razie niemożności polubownego rozstrzygnięcia, strony poddadzą pod rozstrzygnięcie sądu powszechnego właściwego dla siedziby Fundacji.',
    ]),

    {
      margin: [0, 26, 0, 0], unbreakable: true, columnGap: 22,
      columns: [
        sigCell({ caption: r.is_minor ? 'podpis przedstawiciela ustawowego Wolontariusza' : 'podpis Wolontariusza', name: signerName(r), signedAt: r.signed_at, via: userVia }),
        { stack: [sigCell({ ...repSigs(r, 'podpis przedstawiciela Fundacji')[0] as Sig }), { text: '', margin: [0, 8, 0, 0] }, sigCell({ ...repSigs(r, 'podpis przedstawiciela Fundacji')[1] as Sig })], width: 200 },
      ],
    },
  ];
}

// --- zgoda wolontariacka (wersja dla osoby pełnoletniej i dla rodzica / opiekuna prawnego) ---------

/** Wybór jak na papierze: wybrana opcja pogrubiona, pozostałe przekreślone, na końcu gwiazdka („niewłaściwe skreślić”). */
function alt(options: string[], chosen: number | null): Content[] {
  const out: Content[] = [];
  options.forEach((option, i) => {
    if (i) out.push('/');
    out.push(chosen === null ? option : i === chosen ? { text: option, bold: true } : { text: option, decoration: 'lineThrough', color: COLORS.muted });
  });
  out.push('*');
  return out;
}
const yn = (v: boolean | null | undefined): number | null => (v === null || v === undefined ? null : v ? 1 : 0);

function volunteerConsent(r: AgreementRow, f: Foundation): Content[] {
  const minor = r.is_minor;
  const place = r.conclusion_place;
  return [
    ...titleBlock(minor ? 'Zgoda wolontariacka' : 'Zgoda wolontariacka', false, minor ? 'rodzica / opiekuna prawnego małoletniego' : undefined),
    { text: [val(place, 12), ', ', val(fmtDate(r.signed_at), 10)], alignment: 'right', margin: [0, 0, 0, 2] },
    { text: 'Miejscowość, data', alignment: 'right', fontSize: 8, margin: [0, 0, 0, 10] },

    heading(minor ? 'Dane wolontariusza (małoletniego)' : 'Dane wolontariusza:'),
    paragraph(['Imię i nazwisko: ', val(personName(r), 28)]),
    paragraph(['Data urodzenia: ', val(fmtDate(r.birth_date), 12)]),
    ...(minor
      ? [heading('Dane rodzica / opiekuna prawnego:'), paragraph(['Imię i nazwisko: ', val(signerName(r), 28)]), paragraph(['Status: ', val(r.guardian_relation, 14)])]
      : []),

    heading('Zgoda'),
    paragraph(minor
      ? ['Jako ', b(r.guardian_relation ?? 'rodzic / opiekun prawny'), ' wyrażam zgodę na udział małoletniego ', b(personName(r)), ` w pracach wolontariackich na rzecz ${f.name} z siedzibą w Baranówku.`]
      : `Wyrażam zgodę na udział w pracach wolontariackich na rzecz ${f.name} z siedzibą w Baranówku.`),

    heading('Oświadczenie'),
    paragraph('Oświadczam, że:'),
    ulist([
      minor
        ? 'Zapoznałem/am się z charakterem działań fundacji, regulaminem wolontariatu i akceptuję fakt, że świadczenia wykonywane przez małoletniego mają charakter nieodpłatny, dobrowolny i społeczny.'
        : 'Zapoznałem/am się z charakterem działań fundacji, regulaminem wolontariatu i akceptuję fakt, że wykonywane przeze mnie świadczenia mają charakter nieodpłatny, dobrowolny i społeczny.',
      minor
        ? 'Nie ma przeciwwskazań zdrowotnych do wykonywania przez małoletniego czynności w ramach wolontariatu. O wszelkich istotnych problemach zdrowotnych (alergie, choroby przewlekłe) poinformowałem/am koordynatora wolontariatu.'
        : 'Nie ma przeciwwskazań zdrowotnych do wykonywania przeze mnie czynności w ramach wolontariatu. O wszelkich istotnych problemach zdrowotnych (alergie, choroby przewlekłe) poinformowałem/am koordynatora wolontariatu.',
    ]),

    heading('Zgoda na wykorzystanie wizerunku'),
    paragraph('Na podstawie art. 81 ust. 1 ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych (Dz. U. 1994 Nr 24 poz. 83 ze zm.)'),
    { text: alt(['wyrażam zgodę', 'nie wyrażam zgody'], r.consent_image === null ? null : r.consent_image ? 0 : 1), alignment: 'center', margin: [0, 2, 0, 6], fontSize: 12 },
    paragraph(minor
      ? 'na nieodpłatne utrwalanie, wykorzystanie i rozpowszechnianie wizerunku małoletniego przez Fundację „Zapłon”. Zgoda obejmuje wykorzystanie zdjęć i nagrań wideo powstałych w trakcie działań wolontariackich w celach informacyjnych i promocyjnych Fundacji (m.in. na stronie internetowej, w mediach społecznościowych oraz w materiałach drukowanych). Zgoda jest udzielona nieodpłatnie i bez ograniczeń czasowych oraz terytorialnych.'
      : 'na nieodpłatne utrwalanie, wykorzystanie i rozpowszechnianie mojego wizerunku przez Fundację „Zapłon”. Zgoda obejmuje wykorzystanie zdjęć i nagrań wideo powstałych w trakcie działań wolontariackich w celach informacyjnych i promocyjnych Fundacji (m.in. na stronie internetowej, w mediach społecznościowych oraz w materiałach drukowanych). Zgoda jest udzielona nieodpłatnie i bez ograniczeń czasowych oraz terytorialnych.'),
    paragraph('Zgodę można w każdej chwili wycofać, kontaktując się z Fundacją. Cofnięcie zgody nie wpływa na zgodność z prawem rozpowszechniania dokonanego przed jej cofnięciem. Odmowa zgody nie wpływa na możliwość wykonywania świadczeń wolontarystycznych.', { fontSize: 9.5 }),

    ...volunteerInfoClause(r, f),
    signRow([{ caption: minor ? 'czytelny podpis rodzica / opiekuna prawnego' : 'czytelny podpis wolontariusza', name: signerName(r), signedAt: r.signed_at, via: userVia }]),
  ];
}

function marketingConsent(r: AgreementRow, kind: 'zleceniobiorcy' | 'wolontariusza'): Content[] {
  return [
    paragraph([
      ...alt(['Wyrażam zgodę', 'Nie wyrażam zgody'], r.marketing_consent === null ? null : r.marketing_consent ? 0 : 1),
      ` na przetwarzanie ${kind === 'wolontariusza' && r.is_minor ? 'adresu e-mail rodzica / opiekuna prawnego' : 'mojego adresu e-mail'} przez Fundację „Zapłon” w celu informowania ${kind === 'wolontariusza' && r.is_minor ? 'o' : 'mnie o'} bieżącej działalności, wydarzeniach, akcjach i projektach realizowanych przez Fundację. Rozumiem, że zgoda jest w pełni dobrowolna i mogę ją w każdej chwili wycofać, kontaktując się z Fundacją. (opcjonalne).`,
    ]),
  ];
}

/** Klauzula dla wolontariuszy - na wzór klauzuli z oświadczenia zleceniobiorcy (zob. przegląd zgodności). */
function volunteerInfoClause(r: AgreementRow, f: Foundation): Content[] {
  const ack = r.info_clause_ack_at;
  return [
    heading('Klauzula Informacyjna (RODO)'),
    olist([
      `Administratorem ${r.is_minor ? 'danych osobowych małoletniego i rodzica / opiekuna prawnego' : 'Twoich danych osobowych'} jest ${f.name} (KRS: ${f.krs}), z siedzibą w ${f.address}.`,
      'Dane przetwarzamy w następujących celach: a) organizacja wolontariatu oraz zawarcie i wykonanie porozumienia wolontariackiego (podstawa prawna: art. 6 ust. 1 lit. b RODO); b) wypełnienie obowiązków prawnych ciążących na Fundacji, w tym objęcie wolontariusza ubezpieczeniem od następstw nieszczęśliwych wypadków oraz obowiązków wynikających z ustawy o działalności pożytku publicznego i o wolontariacie, a w przypadku kontaktu z małoletnimi także z ustawy o przeciwdziałaniu zagrożeniom przestępczością na tle seksualnym i ochronie małoletnich (podstawa prawna: art. 6 ust. 1 lit. c RODO); c) wykorzystanie wizerunku - wyłącznie na podstawie zgody (art. 6 ust. 1 lit. a RODO).',
      'Dane mogą być przekazywane podmiotom przetwarzającym je na nasze zlecenie (w szczególności dostawcom usług informatycznych i ubezpieczycielowi) oraz uprawnionym organom państwowym na podstawie przepisów prawa.',
      'Dane będą przechowywane przez okres trwania porozumienia, a po jego zakończeniu przez czas określony w przepisach prawa oraz do czasu przedawnienia roszczeń.',
      'Przysługuje prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania oraz przenoszenia danych, a także prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO). Zgodę na wykorzystanie wizerunku można wycofać w każdym czasie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem.',
      'Podanie danych jest warunkiem niezbędnym do zawarcia porozumienia. Brak podania danych uniemożliwi jego zawarcie.',
    ]),
    paragraph(ack ? [b('Oświadczam, że zapoznałem/am się z Klauzulą Informacyjną dotyczącą przetwarzania danych osobowych przez Fundację „Zapłon”. '), `(${fmtDateTime(ack)})`] : 'Oświadczam, że zapoznałem/am się z Klauzulą Informacyjną dotyczącą przetwarzania danych osobowych przez Fundację „Zapłon”. (do potwierdzenia przed podpisem)'),
    ...marketingConsent(r, 'wolontariusza'),
  ];
}

// --- umowa zlecenie, rachunek, oświadczenie zleceniobiorcy -----------------------------------------

function mandateContract(r: AgreementRow, f: Foundation): Content[] {
  const rate = r.rate_grosze ?? 0;
  return [
    ...titleBlock(['Umowa Zlecenie nr ', { text: r.contract_number ? r.contract_number : ' '.repeat(10), decoration: 'underline', decorationStyle: 'dotted' }], true),
    { text: ['Umowa zawarta w dniu ', val(conclusionDate(r), 10), ' w ', val(r.conclusion_place, 14), ', pomiędzy:'], margin: [0, 6, 0, 6] },
    ...fundacjaIntro(r, f, 'Zleceniodawcą').slice(0, 2),
    paragraph(['zwaną dalej ', b('Zleceniodawcą,'), ' a']),
    paragraph([b(personName(r)), ' (imię i nazwisko), numer PESEL: ', val(r.pesel, 11), ', zamieszkałą/ym w: ', val(address(r), 24), ' (adres zamieszkania), zwaną/ym dalej ', b('Zleceniobiorcą.')], { alignment: 'left' }),
    paragraph('Zleceniodawca i zleceniobiorca łącznie nazywani są stronami.'),

    paragraphNo('§ 1'),
    paragraph(['Zleceniodawca zleca a Zleceniobiorca zobowiązuje się do wykonania następujących czynności: ', val(r.scope, 40)]),
    paragraphNo('§ 2'),
    paragraph(['Termin wykonania zlecenia ustala się na okres od ', val(fmtDate(r.start_date), 10), ' do ', val(fmtDate(r.end_date), 10), '.']),

    paragraphNo('§ 3'),
    olist([
      'Zleceniobiorca zobowiązuje się wykonać prace określone w § 1 z zachowaniem należytej staranności, w terminie wyznaczonym przez Zleceniodawcę.',
      'Zleceniobiorca oświadcza, że posiada odpowiednie kwalifikacje wymagane przy realizacji czynności określonych w § 1 umowy.',
    ]),
    paragraphNo('§ 4'),
    olist([
      'Zleceniobiorca nie może powierzyć wykonania zlecenia osobie trzeciej.',
      'Zleceniobiorca nie może zrzec się prawa do wynagrodzenia ani przenieść prawa do tego wynagrodzenia na inną osobę.',
    ]),

    paragraphNo('§ 5'),
    olist([
      ['Za wykonanie czynności określonych w § 1 umowy Zleceniobiorcy przysługuje wynagrodzenie w wysokości: ', val(r.rate_grosze === null ? '' : (rate / 100).toFixed(2).replace('.', ','), 8), ' zł brutto za godzinę pracy. (słownie złotych: ', val(r.rate_grosze === null ? '' : plnInWords(rate), 26), ').'],
      'Z wynagrodzenia, o którym mowa w ust. 1 Zleceniodawca dokona stosownych potrąceń, zgodnie z obowiązującymi przepisami o systemie ubezpieczeń społecznych oraz o podatku dochodowym od osób fizycznych.',
      'Potwierdzeniem czasu wykonywania czynności określonych w § 1 umowy i podstawą do wypłaty wynagrodzenia będzie Rachunek, który stanowi załącznik nr 1. Zleceniobiorca zobowiązuje się przekazać Zleceniodawcy Rachunek po wykonaniu zlecenia.',
      'Zleceniodawca weryfikuje staranność i prawidłowość wykonania czynności określonych w § 1 i przyjmuje od Zleceniobiorcy Rachunek.',
      ['Wypłaty wynagrodzenia dokonuje się w formie przelewu, na rachunek bankowy Zleceniobiorcy nr ', val(r.contractor_statement ? formatIban(r.contractor_statement.iban) : '', 30), ' nie później niż w ciągu 14 dni od dnia przyjęcia przez Zleceniodawcę Rachunku.'],
    ]),

    paragraphNo('§ 6'),
    olist([
      'Zleceniobiorca zobowiązuje się udzielić na każde żądanie Zleceniodawcy informacji o przebiegu realizacji zlecenia.',
      'Zleceniobiorca zobowiązuje się niezwłocznie poinformować Zleceniodawcę, jeśli zachodzą okoliczności, które mogą wpływać na brak możliwości realizacji zlecenia lub wpływać na konieczność zwiększenia czasu realizacji zlecenia.',
      'Zleceniobiorca zobowiązuje się złożyć sprawozdanie z realizacji zlecenia, w terminie 7 dni od wezwania Zleceniodawcy.',
    ]),
    paragraphNo('§ 7'),
    paragraph('Każda ze stron może umowę wypowiedzieć w każdym czasie za miesięcznym okresem wypowiedzenia.'),
    paragraphNo('§ 8'),
    paragraph('Wszelkie spory wynikłe na tle realizacji niniejszej umowy strony zobowiązują się rozstrzygać polubownie. W razie niemożności polubownego rozstrzygnięcia, strony poddadzą pod rozstrzygnięcie sądu powszechnego właściwego dla siedziby Zleceniodawcy.'),
    paragraphNo('§ 9'),
    olist([
      'Zmiana warunków niniejszej umowy może być dokonywana w formie pisemnej pod rygorem nieważności.',
      'W sprawach nieuregulowanych postanowieniami niniejszej umowy mają zastosowanie przepisy Ustawy z dnia 23 kwietnia 1964 r. Kodeks cywilny (t.j. Dz. U. z 2025 r. poz. 1071).',
      'Wszelkie załączniki stanowią integralną część umowy.',
      'Umowa została zawarta w postaci elektronicznej, w sposób opisany w Karcie podpisów (kod jednorazowy przesłany na adres e-mail Zleceniobiorcy oraz potwierdzenie przez dwóch przedstawicieli Zleceniodawcy). Każda ze stron otrzymuje kopię umowy w postaci pliku PDF.',
    ]),
    signRow(repSigs(r, 'podpis Zleceniodawcy')),
    signRow([{ caption: 'podpis Zleceniobiorcy', name: personName(r), signedAt: r.signed_at, via: userVia }]),
  ];
}

function rachunek(r: AgreementRow, f: Foundation): Content[] {
  const line = (label: string, bold = false): Content => ({ text: [{ text: `${label} `, bold }, val('', 40)], margin: [0, 0, 0, 7] });
  return [
    ...titleBlock('Rachunek', false, `do Umowy Zlecenie nr ${r.contract_number ?? ''}`),
    { text: val('', 26), alignment: 'right' },
    { text: 'miejscowość, data', alignment: 'right', fontSize: 8, margin: [0, 0, 0, 14] },
    { text: ['Zleceniobiorca: ', val(personName(r), 28)], font: HEAD, bold: true, fontSize: 14, margin: [0, 0, 0, 2] },
    { text: 'imię i nazwisko', alignment: 'center', fontSize: 8, margin: [0, 0, 0, 12] },
    { text: [{ text: 'Zleceniodawca: ', font: HEAD, bold: true, fontSize: 14 }, { text: `${f.name} (KRS nr ${f.krs}) z siedzibą w ${f.address}.`, font: HEAD, fontSize: 13 }], margin: [0, 0, 0, 16] },
    line('Liczba godzin wykonywania czynności określonych w § 1 umowy:'),
    line('Kwota brutto:'), line('Składki na ubezpieczenia społeczne:'), line('Koszty uzyskania przychodu:'),
    line('Podstawa opodatkowania:'), line('Zaliczka na podatek dochodowy:'), line('Składka zdrowotna:'),
    line('RAZEM:', true), line('Przelew na rachunek bankowy:', true),
    { text: 'Rachunek wypełnia i podpisuje się po wykonaniu zlecenia (§ 5 ust. 3 umowy). Formularz jest wzorem załączonym do umowy.', fontSize: 8, color: COLORS.muted, margin: [0, 18, 0, 0] },
  ];
}

function contractorStatement(r: AgreementRow, f: Foundation): Content[] {
  const s = r.contractor_statement;
  const d = (v: string | undefined) => val(fmtDate(v), 9);
  const idx = <T extends string>(list: readonly T[], v: T | '' | undefined) => (v ? list.indexOf(v as T) : null);
  const row = (label: string, value: Content): Content => ({ columns: [{ width: 120, text: label }, { width: '*', text: [value] }], margin: [0, 0, 0, 6] });
  const note = { text: '* – niewłaściwe skreślić', fontSize: 8, margin: [0, 6, 0, 0] } as Content;
  return [
    ...titleBlock('Oświadczenie zleceniobiorcy', false),
    { text: val(fmtDate(r.signed_at), 18), alignment: 'right' },
    { text: 'miejscowość, data', alignment: 'right', fontSize: 8, margin: [0, 0, 0, 6] },
    {
      columns: [
        { width: '*', stack: [heading('Dane podstawowe'), row('Imiona:', val(r.first_name)), row('Nazwisko:', val(r.last_name)), row('PESEL:', val(r.pesel)), row('E-mail:', val(r.email, 18))] },
        { width: '*', stack: [heading('Adres'), row('Ulica:', val(r.street)), row('Numer domu/lokalu:', val(r.house_number)), row('Kod pocztowy:', val(r.postal_code)), row('Poczta:', val(s?.postOffice)), row('Miejscowość:', val(r.city)), row('Gmina:', val(s?.gmina)), row('Powiat:', val(s?.powiat)), row('Województwo:', val(s?.voivodeship))] },
      ],
      columnGap: 20,
    },
    heading('Pozostałe'),
    row('Urząd Skarbowy:', val(s?.taxOffice, 30)), row('Oddział NFZ:', val(s?.nfzBranch, 30)), row('Numer konta bankowego:', val(s ? formatIban(s.iban) : '', 30)),
    paragraph(`Oświadczam, że wszystkie podane przeze mnie dane są zgodne z prawdą i stanem faktycznym. Zobowiązuję się do niezwłocznego poinformowania Fundacji „Zapłon” o wszelkich zmianach tych danych.`, { margin: [0, 10, 0, 0] }),
    signRow([{ caption: 'podpis zleceniobiorcy', name: personName(r), signedAt: r.signed_at, via: userVia }]),

    { text: '', pageBreak: 'before', fontSize: 1 },
    heading('Oświadczenia', [0, 0, 0, 8]),
    paragraph('Oświadczam, że'),
    olist([
      [...alt(['Nie jestem', 'Jestem'], yn(s?.employed)), ' jednocześnie zatrudniona/ny na podstawie umowy o pracę lub równorzędnej w okresie od ', d(s?.employedFrom), ' do ', d(s?.employedTo), ', a moje wynagrodzenie ze stosunku pracy w kwocie brutto wynosi ', ...alt(['co najmniej minimalne wynagrodzenie', 'mniej niż minimalne wynagrodzenie'], s?.employed ? (s.employedSalary === 'min' ? 0 : s.employedSalary === 'below' ? 1 : null) : null), '.'],
      ['W czasie wykonywania umowy zlecenie, której dotyczy oświadczenie ', ...alt(['nie przebywam', 'przebywam'], yn(s?.leave)), ' na urlopie ', ...alt(['bezpłatnym', 'wychowawczym', 'macierzyńskim'], s?.leave ? idx(['unpaid', 'parental', 'maternity'] as const, s.leaveType) : null), ' przyznanym w okresie od ', d(s?.leaveFrom), ' do ', d(s?.leaveTo), ','],
      [...alt(['Nie jestem', 'Jestem'], yn(s?.otherContract)), ' jednocześnie już ubezpieczona/ny (ubezpieczenie emerytalne i rentowe) jako osoba wykonująca pracę nakładczą; umowę zlecenia lub agencyjną w okresie od ', d(s?.otherContractFrom), ' do ', d(s?.otherContractTo), ', wynagrodzenie z tej umowy ', ...alt(['przekracza', 'nie przekracza'], s?.otherContract ? (s.otherContractExceeds === null ? null : s.otherContractExceeds ? 0 : 1) : null), ' minimalnego wynagrodzenia za pracę.'],
      [...alt(['Nie jestem', 'Jestem'], yn(s?.otherTitle)), ' już ubezpieczona/ny (ubezpieczenie emerytalne i rentowe) z innych tytułów niż w pkt 1 i 2 (np. JDG, KRUS). Tytuł do ubezpieczenia: ', val(s?.otherTitleText, 20)],
      [...alt(['Nie jestem', 'Jestem'], yn(s?.pensioner)), ' emerytem lub rencistą. Nr decyzji ZUS i data jego przyznania: ', val(s?.pensionDecision, 20)],
      [...alt(['Nie posiadam', 'Posiadam'], yn(s?.disability)), ' orzeczenie o ', ...alt(['lekkim', 'umiarkowanym', 'znacznym'], s?.disability ? idx(['lekki', 'umiarkowany', 'znaczny'] as const, s.disabilityDegree) : null), ' stopniu niepełnosprawności wydane na okres od ', d(s?.disabilityFrom), ' do ', d(s?.disabilityTo), ','],
      [...alt(['Nie jestem', 'Jestem'], yn(s?.student)), ' uczniem lub studentem do 26. roku życia.'],
      [...alt(['Nie jestem', 'Jestem'], yn(s?.unemployed)), ' zarejestrowana/ny jako osoba bezrobotna.'],
      [...alt(['Nie jestem', 'Jestem'], yn(s?.otherInsurance)), ' objęta/ty ubezpieczeniem społecznym z innego tytułu.'],
    ], { margin: [0, 0, 0, 6] }),
    paragraph('Zgodnie z powyższym oświadczeniem z tytułu wykonywania tej umowy:'),
    paragraph([...alt(['chcę', 'nie chcę'], s ? (s.voluntarySickness ? 0 : 1) : null), ' być objęta/ty dobrowolnym ubezpieczeniem chorobowym,'], { margin: [18, 0, 0, 2] }),
    paragraph([...alt(['chcę', 'nie chcę'], s ? (s.voluntaryPension ? 0 : 1) : null), ' być objęta/ty dobrowolnym ubezpieczeniem emerytalnym i rentowym.'], { margin: [18, 0, 0, 6] }),
    olist([
      [...alt(['Nie chcę', 'Chcę'], yn(s?.pitExemption)), ', aby moje przychody zostały objęte zwolnieniem z PIT.'],
      [...alt(['Nie posiadam', 'Posiadam'], yn(s?.taxResidency)), ' certyfikat rezydencji podatkowej wydany na okres od ', d(s?.taxResidencyFrom), ' do ', d(s?.taxResidencyTo), '.'],
      ['Limit kosztów autorskich zastosowanych w bieżącym roku ', ...alt(['nie przekracza', 'przekracza'], s ? (s.authorCostsExceeded ? 1 : 0) : null), ' ograniczenia rocznego. Dotychczas zastosowano: ', val(s?.authorCostsApplied, 12), '.'],
    ], { start: 10 } as Record<string, unknown>),
    note,
    signRow([{ caption: 'podpis zleceniobiorcy', name: personName(r), signedAt: r.signed_at, via: userVia }]),

    { text: '', pageBreak: 'before', fontSize: 1 },
    heading('Klauzula Informacyjna (RODO)', [0, 0, 0, 8]),
    olist([
      `Administratorem Twoich danych osobowych jest ${f.name} (KRS: ${f.krs}), z siedzibą w Baranówko 19B, 62-050 Mosina.`,
      'Twoje dane przetwarzamy w następujących celach: a. Zawarcie i wykonanie umowy cywilnoprawnej (podstawa prawna: art. 6 ust. 1 lit. b RODO). b. Wypełnienie obowiązków prawnych ciążących na Fundacji, tj. realizacja rozliczeń podatkowych oraz ubezpieczeń społecznych wobec ZUS i Urzędu Skarbowego (podstawa prawna: art. 6 ust. 1 lit. c RODO).',
      'Twoje dane mogą być przekazywane podmiotom zewnętrznym wspierającym nas w działalności, tj. podmiotom przetwarzającym dane na nasze zlecenie. W szczególności jest to nasze biuro rachunkowe: FINTELLIGENT TAX SP. Z O.O., z siedzibą w Piasecznie, które realizuje dla nas obsługę kadrowo-płacową i rachunkową. Ponadto Twoje dane będą przekazywane uprawnionym organom państwowym (np. ZUS, Urząd Skarbowy) na podstawie powszechnie obowiązujących przepisów prawa.',
      'Twoje dane będą przechowywane przez okres trwania umowy, a po jej zakończeniu przez czas ściśle określony w przepisach prawa podatkowego i ubezpieczeń społecznych (zazwyczaj 5 lat, licząc od końca roku kalendarzowego, w którym upłynął termin płatności podatku).',
      'W związku z przetwarzaniem przez nas Twoich danych, masz prawo do: dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania oraz przenoszenia danych. Masz również prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (UODO), jeśli uznasz, że przetwarzanie narusza przepisy RODO.',
      'Podanie przez Ciebie danych osobowych (m.in. imię, nazwisko, PESEL, adres zamieszkania) jest wymogiem ustawowym i warunkiem niezbędnym do zawarcia umowy cywilnoprawnej. Brak podania danych uniemożliwi nam zawarcie i poprawne rozliczenie umowy.',
    ]),
    paragraph(r.info_clause_ack_at ? [b('Oświadczam, że zapoznałem/am się z Klauzulą Informacyjną dotyczącą przetwarzania danych osobowych przez Fundację „Zapłon”. '), `(${fmtDateTime(r.info_clause_ack_at)})`] : 'Oświadczam, że zapoznałem/am się z Klauzulą Informacyjną dotyczącą przetwarzania danych osobowych przez Fundację „Zapłon”. (do potwierdzenia przed podpisem)'),
    ...marketingConsent(r, 'zleceniobiorcy'),
    signRow([{ caption: 'podpis zleceniobiorcy', name: personName(r), signedAt: r.signed_at, via: userVia }]),
  ];
}

function minorsAnnex(r: AgreementRow, f: Foundation, number: number): Content[] {
  const role = r.kind === 'mandate' ? 'zleceniobiorcy' : 'wolontariusza';
  return [
    ...titleBlock(`Załącznik nr ${number}`, false, 'Oświadczenie i zgoda dotyczące ochrony małoletnich'),
    paragraph('W związku z tym, że zakres mojej współpracy z Fundacją obejmuje bezpośrednią pracę z małoletnimi:'),
    olist([
      'Zostałem/am poinformowany/a, że warunkiem dopuszczenia do aktywności jest uprzednie przedstawienie zaświadczenia o niekaralności z Krajowego Rejestru Karnego oraz weryfikacja w Rejestrze Sprawców Przestępstw na Tle Seksualnym.',
      ['Wyrażam zgodę na sprawdzenie moich danych w Rejestrze Sprawców Przestępstw na Tle Seksualnym przez upoważnioną osobę Fundacji.', { text: r.consent_rspts ? ' (zgoda złożona)' : ' (do uzupełnienia przed podpisem)', color: COLORS.muted }],
      ['Przedkładam zaświadczenie o niekaralności z Krajowego Rejestru Karnego wystawione w dniu ', val(fmtDate(r.krk_issue_date), 10), '. Oświadczam, że nie toczy się przeciwko mnie postępowanie karne o przestępstwo przeciwko wolności seksualnej lub obyczajności ani o inne przestępstwo, o którym mowa w ustawie o przeciwdziałaniu zagrożeniom przestępczością na tle seksualnym i ochronie małoletnich, oraz zobowiązuję się niezwłocznie poinformować Fundację o wszczęciu takiego postępowania.'],
      `Dane o niekaralności ${f.name} przetwarza wyłącznie w celu wykonania obowiązku wynikającego z ustawy (art. 6 ust. 1 lit. c oraz art. 10 RODO), a ich weryfikacja jest warunkiem rozpoczęcia współpracy.`,
    ]),
    signRow([{ caption: `podpis ${role}`, name: personName(r), signedAt: r.signed_at, via: userVia }]),
  ];
}

function signatureCard(r: AgreementRow, f: Foundation, hash: string, list: Annex[]): Content[] {
  const mandate = r.kind === 'mandate';
  const docs = mandate
    ? [`Umowa Zlecenie${r.contract_number ? ` nr ${r.contract_number}` : ''}`, ...list.map((a, i) => `Załącznik nr ${i + 1} - ${a.title}`)]
    : ['Porozumienie o wykonywaniu świadczeń wolontariackich', r.is_minor ? 'Zgoda wolontariacka rodzica / opiekuna prawnego' : 'Zgoda wolontariacka', ...list.map((a) => a.title)];
  const rows: Array<[string, string]> = [
    ['Identyfikator dokumentu', r.id],
    ['Wzór dokumentów', `${TEMPLATE_VERSION}${templatesApproved() ? '' : ' (WERSJA ROBOCZA)'}`],
    ['Dokumenty w pakiecie', docs.join('\n')],
    ['Skrót treści (SHA-256)', hash],
    [r.is_minor ? 'Strona 1 (przedstawiciel ustawowy)' : 'Strona 1', `${signerName(r)}${r.is_minor ? `, ${r.guardian_relation ?? ''} małoletniego ${personName(r)}` : ''}`],
    ['Sposób złożenia oświadczenia', 'Po zapoznaniu się z dokumentami, wpisanie kodu jednorazowego przesłanego na adres e-mail osoby podpisującej'],
    ['Data i godzina (strefa Europe/Warsaw)', r.signed_at ? fmtDateTime(r.signed_at) : '-'],
    ['Adres IP', r.signed_ip ?? '-'],
    [`Strona 2 - ${f.name} (przedstawiciel 1)`, `${r.rep_name ?? ''}, ${r.rep_role ?? ''}: ${r.cosign1_at ? `${fmtDateTime(r.cosign1_at)}, konto ${r.cosign1_by ?? '-'}` : 'oczekuje na podpis'}`],
    [`Strona 2 - ${f.name} (przedstawiciel 2)`, `${r.rep2_name ?? ''}, ${r.rep2_role ?? ''}: ${r.cosign2_at ? `${fmtDateTime(r.cosign2_at)}, konto ${r.cosign2_by ?? '-'}` : 'oczekuje na podpis'}`],
  ];
  return [
    ...titleBlock('Karta podpisów', false),
    paragraph('Dokumenty zostały podpisane w postaci elektronicznej zwykłą formą podpisu. Nie jest to kwalifikowany podpis elektroniczny w rozumieniu rozporządzenia (UE) nr 910/2014. Strony uznały taką formę za wystarczającą (zob. postanowienia końcowe).'),
    {
      margin: [0, 6, 0, 0],
      table: { widths: [135, '*'], body: rows.map(([k, v]) => [{ text: k, color: COLORS.muted, fontSize: 8.5, margin: [3, 3, 3, 3] }, { text: v, fontSize: 9, margin: [3, 3, 3, 3] }]) },
      layout: { hLineColor: () => '#bbbbbb', vLineColor: () => '#bbbbbb', hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    },
  ];
}

// --- całość ----------------------------------------------------------------------------------------

let pdfReady = false;
function initPdf() {
  if (pdfReady) return;
  // Typy pdfmake nie opisują wirtualnego systemu plików, z którego generator czyta czcionki.
  const vfs = (pdfmake as unknown as { virtualfs: { writeFileSync(name: string, data: Buffer): void } }).virtualfs;
  // Dokument zawiera tekst od użytkownika - generator nie ma prawa sięgać do sieci ani dysku.
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy(() => false);
  const files: Array<[string, string]> = [
    ['NotoSerif-Regular.ttf', NOTOSERIF_REGULAR_B64], ['NotoSerif-Bold.ttf', NOTOSERIF_BOLD_B64], ['NotoSerif-ExtraBold.ttf', NOTOSERIF_EXTRABOLD_B64],
    ['Signika-Regular.ttf', SIGNIKA_REGULAR_B64], ['Signika-Medium.ttf', SIGNIKA_MEDIUM_B64], ['Signika-Bold.ttf', SIGNIKA_BOLD_B64],
  ];
  for (const [name, b64] of files) vfs.writeFileSync(name, Buffer.from(b64, 'base64'));
  pdfmake.setFonts({
    [SERIF]: { normal: 'NotoSerif-Regular.ttf', bold: 'NotoSerif-Bold.ttf', italics: 'NotoSerif-Regular.ttf', bolditalics: 'NotoSerif-Bold.ttf' },
    [HEAD]: { normal: 'Signika-Medium.ttf', bold: 'Signika-Bold.ttf', italics: 'Signika-Medium.ttf', bolditalics: 'Signika-Bold.ttf' },
    SerifXB: { normal: 'NotoSerif-ExtraBold.ttf', bold: 'NotoSerif-ExtraBold.ttf', italics: 'NotoSerif-ExtraBold.ttf', bolditalics: 'NotoSerif-ExtraBold.ttf' },
  });
  pdfReady = true;
}

export function buildDefinition(r: AgreementRow, f: Foundation, hash: string): TDocumentDefinitions {
  const list = annexes(r);
  const content: Content[] = [
    ...(r.kind === 'mandate' ? mandateContract(r, f) : volunteerAgreement(r, f)),
    ...(r.kind === 'mandate' ? rachunek(r, f) : volunteerConsent(r, f)),
    ...(r.kind === 'mandate' ? contractorStatement(r, f) : []),
    ...(r.minors_checks_required ? minorsAnnex(r, f, annexNo(list, 'minors')) : []),
    ...(r.signed_at ? signatureCard(r, f, hash, list) : []),
  ];

  return {
    info: { title: `${r.kind === 'mandate' ? 'Umowa zlecenie' : 'Porozumienie wolontariackie'} - ${personName(r)}`, author: f.name, creator: f.name },
    pageSize: 'A4',
    pageMargins: [57, 57, 57, 85],
    defaultStyle: { font: SERIF, fontSize: 11, lineHeight: 1.0, color: COLORS.text },
    footer: (page: number, pages: number) => ({
      margin: [57, 14, 57, 0],
      columns: [
        { width: '*', text: `Dokument ${r.id.slice(0, 8)}  ·  wzór ${TEMPLATE_VERSION}`, fontSize: 6.5, color: COLORS.muted, margin: [0, 3, 0, 0] },
        { width: 70, alignment: 'right', text: `${page} z ${pages}`, font: HEAD, bold: true, fontSize: 10 },
      ],
    }),
    ...(templatesApproved()
      ? {}
      : { watermark: { text: 'WERSJA ROBOCZA', color: COLORS.danger, opacity: 0.08, bold: true, italics: false, fontSize: 62 } }),
    content,
  };
}

export async function buildPackage(r: AgreementRow, f: Foundation, hash: string): Promise<Buffer> {
  initPdf();
  const bytes = await pdfmake.createPdf(buildDefinition(r, f, hash)).getBuffer();
  return Buffer.from(bytes);
}
