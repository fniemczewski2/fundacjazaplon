import type { VercelRequest, VercelResponse } from '@vercel/node';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MailerLiteFields = {
  name?: string;
  ostatni_plik_url?: string;
  ostatni_plik_tytul?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda niedozwolona' });
  }

  const { name, email, file_url, file_title } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Podaj prawidłowy adres e-mail.' });
  }

  try {
    const API_KEY = process.env.MAILERLITE_API_KEY;
    const ALL_GROUP_ID = process.env.MAILERLITE_GROUP_ID;
    const MATERIALS_GROUP_ID = process.env.MAILERLITE_MATERIALS_GROUP_ID;

    const groupsToJoin: string[] = [];
    if (ALL_GROUP_ID) groupsToJoin.push(ALL_GROUP_ID);
    if (file_url && MATERIALS_GROUP_ID) groupsToJoin.push(MATERIALS_GROUP_ID);

    const fieldsPayload: MailerLiteFields = {};
    if (typeof name === 'string' && name) fieldsPayload.name = name.slice(0, 200);
    if (typeof file_url === 'string' && file_url) fieldsPayload.ostatni_plik_url = file_url.slice(0, 500);
    if (typeof file_title === 'string' && file_title) fieldsPayload.ostatni_plik_tytul = file_title.slice(0, 200);

    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        fields: Object.keys(fieldsPayload).length > 0 ? fieldsPayload : undefined,
        groups: groupsToJoin.length > 0 ? groupsToJoin : undefined,
        status: 'active',
      }),
    });

    if (!response.ok) {
      // Nie przekazujemy surowej odpowiedzi MailerLite dalej do klienta —
      // mogłaby zawierać wewnętrzne szczegóły API dostawcy.
      console.error('MailerLite error:', response.status, await response.text());
      return res.status(502).json({ error: 'Wystąpił błąd po stronie serwera.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('subscribe-newsletter error:', error);
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera.' });
  }
}
