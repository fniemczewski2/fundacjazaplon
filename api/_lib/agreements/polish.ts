// Kwota słownie po polsku (do 999 999,99 zł) - do umowy zlecenia ("słownie złotych ...").

const UNITS = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
const TEENS = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
const TENS = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
const HUNDREDS = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h] as string);
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10] as string);
  else {
    if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)] as string);
    if (rest % 10) parts.push(UNITS[rest % 10] as string);
  }
  return parts.join(' ');
}

/** 0..999 999 -> słowa. Poprawna odmiana: tysiąc / tysiące / tysięcy. */
export function integerInWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError('Poza zakresem: 0-999999');
  if (n === 0) return 'zero';
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (thousands) {
    const last = thousands % 10;
    const lastTwo = thousands % 100;
    const noun = thousands === 1 ? 'tysiąc' : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? 'tysiące' : 'tysięcy';
    parts.push(thousands === 1 ? noun : `${below1000(thousands)} ${noun}`);
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

/** 4500 gr -> "czterdzieści pięć złotych 00/100". */
export function plnInWords(grosze: number): string {
  const zl = Math.floor(grosze / 100);
  const gr = grosze % 100;
  const last = zl % 10;
  const lastTwo = zl % 100;
  const noun = zl === 1 ? 'złoty' : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? 'złote' : 'złotych';
  return `${integerInWords(zl)} ${noun} ${String(gr).padStart(2, '0')}/100`;
}
