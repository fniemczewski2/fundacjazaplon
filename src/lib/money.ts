import type { MoneyAmount } from '../../shared/finance';

const ZERO_DECIMAL = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

/** Kwota w najmniejszej jednostce waluty (grosze) jako tekst, np. „50,00 zł”. */
export function formatMoney({ amount, currency }: MoneyAmount): string {
  const divisor = ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100;
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / divisor);
}

export function formatMoneyList(list: MoneyAmount[]): string {
  return list.length === 0
    ? formatMoney({ amount: 0, currency: 'pln' })
    : list.map(formatMoney).join(' + ');
}
