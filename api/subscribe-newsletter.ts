import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda niedozwolona' });
  }

  const { name, email, file_url, file_title } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Podaj prawidłowy adres e-mail.' });
  }

  try {
    const API_KEY = process.env.MAILERLITE_API_KEY;

    const ALL_GROUP_ID = process.env.MAILERLITE_GROUP_ID; 
    const MATERIALS_GROUP_ID = process.env.MAILERLITE_MATERIALS_GROUP_ID;


    const groupsToJoin = [];

    if (ALL_GROUP_ID) {
      groupsToJoin.push(ALL_GROUP_ID);
    }

    if (file_url && MATERIALS_GROUP_ID) {
      groupsToJoin.push(MATERIALS_GROUP_ID);
    }
    
    const fieldsPayload: any = {};
    if (name) fieldsPayload.name = name;
    if (file_url) fieldsPayload.ostatni_plik_url = file_url;
    if (file_title) fieldsPayload.ostatni_plik_tytul = file_title;

    const url = 'https://connect.mailerlite.com/api/subscribers';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        fields: Object.keys(fieldsPayload).length > 0 ? fieldsPayload : undefined,
        groups: groupsToJoin.length > 0 ? groupsToJoin : undefined,
        status: 'active'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.message || 'Wystąpił błąd po stronie serwera.' 
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera.' });
  }
}