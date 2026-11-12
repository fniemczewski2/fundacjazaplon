/**
 * Treść stron prawnych. Teksty są projektem opartym na faktycznym działaniu serwisu i wymagają weryfikacji
 * przez prawnika Fundacji przed uznaniem ich za obowiązujące.
 */
export type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] };

export const LEGAL_UPDATED = '12 listopada 2026 r.';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Administrator danych',
    paragraphs: [
      'Administratorem danych osobowych jest Fundacja „Zapłon” z siedzibą w Baranówku 19B, 62-050 Mosina (KRS 0001178189, NIP 7773448597, REGON 541978238).',
      'Kontakt w sprawach danych osobowych: biuro@zaplon.org.pl.',
    ],
  },
  {
    heading: '2. Cele, podstawy prawne i zakres danych',
    items: [
      'Formularz kontaktowy (imię i nazwisko, e-mail, treść wiadomości): odpowiedź na wiadomość, art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: obsługa korespondencji).',
      'Newsletter i pobieranie materiałów (imię, e-mail): wysyłka informacji o działaniach Fundacji, art. 6 ust. 1 lit. a RODO (zgoda). Zapis wymaga potwierdzenia w wiadomości e-mail.',
      'Darowizny online (imię, e-mail, kwota): obsługa darowizny i potwierdzenie wpłaty, art. 6 ust. 1 lit. b i c RODO. Dane płatnicze przetwarza operator płatności Stripe, Fundacja nie widzi numeru karty.',
      'Rozliczenia faktur (e-mail, cel wydatku, kwota, numer rachunku, plik faktury lub numer KSeF): weryfikacja i zwrot wydatku, art. 6 ust. 1 lit. b i c RODO.',
      'Umowy wolontariackie (dane identyfikacyjne i kontaktowe, numer PESEL, data urodzenia, numer rachunku, a w przypadkach wymaganych przepisami także informacje z rejestrów dotyczące ochrony małoletnich): zawarcie i wykonanie umowy oraz obowiązki prawne, art. 6 ust. 1 lit. b i c RODO. Numer PESEL jest przechowywany w postaci zaszyfrowanej.',
      'Statystyki odwiedzin (Google Analytics): analiza korzystania z serwisu, art. 6 ust. 1 lit. a RODO (zgoda). Bez zgody skrypt Google nie jest ładowany.',
      'Bezpieczeństwo serwisu (skrót adresu IP, rodzaj zdarzenia): ochrona przed nadużyciami i atakami, art. 6 ust. 1 lit. f RODO.',
    ],
  },
  {
    heading: '3. Odbiorcy danych',
    paragraphs: [
      'Dane mogą być powierzane podmiotom, które świadczą Fundacji usługi techniczne: Supabase (baza danych i pliki), Vercel (hosting), Microsoft (poczta e-mail), MailerLite (newsletter), Stripe (płatności), Cloudflare (ochrona formularzy Turnstile) oraz, po wyrażeniu zgody, Google (statystyki).',
      'Część tych podmiotów może przetwarzać dane poza Europejskim Obszarem Gospodarczym. Wówczas przekazanie opiera się na decyzji Komisji Europejskiej o odpowiednim stopniu ochrony albo na standardowych klauzulach umownych.',
    ],
  },
  {
    heading: '4. Okres przechowywania',
    paragraphs: [
      'Dane przechowujemy przez czas niezbędny do realizacji celu, a następnie przez okres wynikający z przepisów (w szczególności księgowych i podatkowych) lub do przedawnienia roszczeń. Dane przetwarzane na podstawie zgody przechowujemy do jej wycofania.',
    ],
  },
  {
    heading: '5. Twoje prawa',
    paragraphs: [
      'Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie. Zgodę możesz wycofać w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania sprzed jej wycofania.',
      'Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).',
      'Podanie danych w formularzach jest dobrowolne, ale niezbędne do realizacji danej czynności.',
    ],
  },
  {
    heading: '6. Pliki cookie i pamięć przeglądarki',
    items: [
      'Niezbędne: zapisanie wybranego motywu (jasny lub ciemny) oraz Twojego wyboru dotyczącego cookies, w pamięci lokalnej przeglądarki. Zalogowane osoby z zespołu mają dodatkowo zapisaną sesję logowania.',
      'Statystyczne (Google Analytics): ustawiane wyłącznie po kliknięciu „Akceptuję” w banerze. Wybór możesz zmienić w dowolnym momencie przyciskiem „Ustawienia cookies” w stopce strony.',
      'Formularz rozliczeń może zapisać wypełniony wniosek w pamięci przeglądarki (IndexedDB), jeśli w chwili wysyłki nie ma połączenia z siecią. Dane są usuwane po udanej wysyłce.',
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Postanowienia ogólne',
    paragraphs: [
      'Regulamin określa zasady korzystania z serwisu zaplon.org.pl prowadzonego przez Fundację „Zapłon” z siedzibą w Baranówku 19B, 62-050 Mosina (KRS 0001178189).',
      'Korzystanie z serwisu oznacza akceptację regulaminu. Dane osobowe przetwarzamy zgodnie z Polityką prywatności.',
    ],
  },
  {
    heading: '2. Zakres usług',
    items: [
      'Przeglądanie treści informacyjnych o działalności Fundacji, aktualności, dokumentów i materiałów do pobrania.',
      'Wysyłanie wiadomości przez formularz kontaktowy.',
      'Zapis na newsletter, który wymaga potwierdzenia adresu e-mail. Rezygnacja jest możliwa w każdej chwili przez link w stopce wiadomości.',
      'Darowizny online, obsługiwane przez operatora płatności Stripe. Darowizna jest dobrowolna i przeznaczona na cele statutowe Fundacji.',
      'Formularze dla osób współpracujących z Fundacją (rozliczenie faktury, zgłoszenie współpracy, podpis dokumentów). Są dostępne wyłącznie dla osób, które z Fundacją współpracują.',
    ],
  },
  {
    heading: '3. Zasady korzystania',
    items: [
      'Zabronione jest podawanie w formularzach danych innych osób bez ich zgody oraz danych nieprawdziwych.',
      'Zabronione jest działanie zakłócające pracę serwisu, w tym zautomatyzowane wysyłanie formularzy i próby obejścia zabezpieczeń.',
      'Fundacja może ograniczyć dostęp osobom naruszającym regulamin.',
    ],
  },
  {
    heading: '4. Prawa autorskie',
    paragraphs: [
      'Treści serwisu (teksty, grafiki, logotypy) są chronione prawem autorskim. Materiały do pobrania można wykorzystywać do własnych działań społecznych, o ile ich opis nie stanowi inaczej, z podaniem źródła.',
    ],
  },
  {
    heading: '5. Reklamacje i kontakt',
    paragraphs: [
      'Uwagi i reklamacje dotyczące działania serwisu można zgłaszać na adres biuro@zaplon.org.pl. Odpowiadamy w terminie 14 dni.',
    ],
  },
  {
    heading: '6. Zmiany regulaminu',
    paragraphs: ['Fundacja może zmienić regulamin. Obowiązuje wersja opublikowana w serwisie w dniu korzystania z niego.'],
  },
];
