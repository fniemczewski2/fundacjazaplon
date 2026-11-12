import { FIELD_NAME_MAX } from './config.js';

const SUBSCRIBERS_URL = 'https://connect.mailerlite.com/api/subscribers';

export type MailerLiteSubscriber = {
  email: string;
  name?: string;
  fields?: Record<string, string>;
  groups?: Array<string | undefined>;
};

/**
 * Dodaje adres do MailerLite. Pole `status` jest pominięte celowo: o podwójnym potwierdzeniu (double opt-in)
 * decyduje ustawienie konta MailerLite, więc adres podany przez osobę trzecią nie staje się aktywny bez potwierdzenia.
 */
export async function subscribeToMailerLite({ email, name, fields = {}, groups = [] }: MailerLiteSubscriber): Promise<Response> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) throw new Error('Brak MAILERLITE_API_KEY.');

  const allFields = { ...(name ? { name: name.slice(0, FIELD_NAME_MAX) } : {}), ...fields };
  const groupIds = groups.filter((id): id is string => Boolean(id));

  return fetch(SUBSCRIBERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    body: JSON.stringify({
      email,
      fields: Object.keys(allFields).length > 0 ? allFields : undefined,
      groups: groupIds.length > 0 ? groupIds : undefined,
    }),
    signal: AbortSignal.timeout(10_000),
  });
}
