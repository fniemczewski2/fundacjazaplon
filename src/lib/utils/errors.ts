/**
 * Bezpiecznie wyciąga czytelny komunikat błędu z wartości typu `unknown`
 * (dokładnie to, co trafia do `catch` w TypeScripcie ze `strict` włączonym).
 *
 * Zastępuje powtarzający się w całym repo wzorzec `catch (e: any) { ... e.message }`,
 * który jest jawnym `any` i milcząco zakłada, że rzucona wartość zawsze jest
 * instancją `Error` z polem `message` — co nie zawsze jest prawdą.
 */
export function getErrorMessage(err: unknown, fallback = 'Wystąpił nieoczekiwany błąd.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}
