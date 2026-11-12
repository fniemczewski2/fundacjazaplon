/**
 * Jedyne miejsce, z którego kod przeglądarkowy pisze do konsoli. W produkcji wypisuje tylko ostrzeżenia i błędy;
 * tu można później podpiąć zdalne raportowanie błędów bez zmian w pozostałych modułach.
 */
const write = (level: 'warn' | 'error', scope: string, details: unknown[]) => {
  // eslint-disable-next-line no-console
  console[level](`[${scope}]`, ...details);
};

export const logger = {
  warn: (scope: string, ...details: unknown[]) => write('warn', scope, details),
  error: (scope: string, ...details: unknown[]) => write('error', scope, details),
};
