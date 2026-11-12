import { getErrorMessage } from './utils/errors';

const GENERIC_ERROR = 'Wystąpił błąd. Spróbuj ponownie.';

async function send(path: string, body: unknown, fallbackError: string, token?: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // `cause` pozwala odróżnić brak sieci (TypeError z fetch) od odpowiedzi serwera z błędem.
    throw new Error(getErrorMessage(err, fallbackError), { cause: err });
  }

  if (!response.ok) {
    // Przy awarii funkcja może odpowiedzieć pustym ciałem lub HTML-em: JSON czytamy tylko po sprawdzeniu nagłówka.
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    const data = (isJson ? await response.json().catch(() => null) : null) as { error?: string } | null;
    throw new Error(data?.error || fallbackError);
  }
  return response;
}

/** Wysyła JSON do funkcji w /api i zwraca odpowiedź. Błąd serwera trafia do wyjątku z jego komunikatem. */
export async function postJson<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  fallbackError = GENERIC_ERROR,
  token?: string,
): Promise<T> {
  const response = await send(path, body, fallbackError, token);
  return (await response.json().catch(() => ({}))) as T;
}

/** Jak `postJson`, ale odpowiedzią jest plik (np. PDF z podglądem dokumentów). */
export async function postBlob(path: string, body: unknown, fallbackError = GENERIC_ERROR, token?: string): Promise<Blob> {
  return (await send(path, body, fallbackError, token)).blob();
}
