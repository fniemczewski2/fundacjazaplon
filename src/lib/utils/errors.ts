export function getErrorMessage(err: unknown, fallback = 'Wystąpił nieoczekiwany błąd.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}
