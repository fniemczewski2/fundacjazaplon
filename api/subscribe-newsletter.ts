import type { IncomingMessage, ServerResponse } from 'node:http';

interface ApiRequest extends IncomingMessage {
  body?: any;
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

type MailerLiteFields = {
  name?: string;
  ostatni_plik_url?: string;
  ostatni_plik_tytul?: string;
};

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Metoda niedozwolona' }));
  }

  const { name, email, file_url, file_title } = req.body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Podaj prawidłowy adres e-mail.' }));
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
      console.error('MailerLite error:', response.status, await response.text());
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Wystąpił błąd po stronie serwera.' }));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('subscribe-newsletter error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Wewnętrzny błąd serwera.' }));
  }
}