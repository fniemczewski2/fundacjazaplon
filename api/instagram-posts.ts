import type { ServerResponse } from 'node:http';
import { authenticateStaff } from './_lib/auth.js';
import { bodyOf, sendJson, type ApiRequest } from './_lib/http.js';
import { checkInstagramConnection, getRecentInstagramPosts } from './_lib/instagram.js';

/**
 * GET: ostatnie posty z Instagrama (publicznie, cache CDN 15 min i cache w Redis).
 * POST {action: 'check'}: diagnostyka połączenia z Graph API dla osób z panelu (rola redaktor lub wyższa).
 */
export default async function handler(req: ApiRequest, res: ServerResponse) {
  try {
    if (req.method === 'GET') {
      const { configured, posts } = await getRecentInstagramPosts();
      const maxAge = posts.length > 0 ? 900 : 60; // pustą odpowiedź (błąd, brak konfiguracji) odświeżamy szybciej
      return sendJson(res, 200, { configured, posts }, {
        'Cache-Control': `public, max-age=60, s-maxage=${maxAge}, stale-while-revalidate=3600`,
      });
    }

    if (req.method === 'POST' && bodyOf(req).action === 'check') {
      const auth = await authenticateStaff(req, res, 'instagram-posts', 'editor');
      if (!auth) return;
      return sendJson(res, 200, await checkInstagramConnection());
    }

    return sendJson(res, 405, { error: 'Metoda niedozwolona' });
  } catch (err) {
    console.error('instagram-posts error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
