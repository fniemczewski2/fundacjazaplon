// netlify/functions/gh.js
const OWNER = 'your-github-owner'; // e.g. 'fundacjazaplon' or your org
const REPO  = 'your-repo-name';    // e.g. 'zaplon-www'

// Resolve allowed origins from env (comma-separated)
const allowedOriginSet = new Set(
  (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// Allow only these GitHub REST paths (prefix match)
const ALLOWED_PATHS = [
  `/repos/${OWNER}/${REPO}`,
  `/repos/${OWNER}/${REPO}/contents/`,
  `/repos/${OWNER}/${REPO}/git/refs`,
  `/repos/${OWNER}/${REPO}/git/refs/`,
  `/repos/${OWNER}/${REPO}/pulls`,
  `/repos/${OWNER}/${REPO}/pulls/`,
];

const ALLOWED_METHODS = new Set(['GET','POST','PUT','PATCH','DELETE','OPTIONS']);

export async function handler(event) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: 'Missing GITHUB_TOKEN' };

  const origin = event.headers.origin || event.headers.Origin || '';
  const method = event.httpMethod || 'GET';

  // Handle CORS preflight quickly
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOriginSet.has(origin) ? origin : 'null',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Max-Age': '600',
      },
      body: '',
    };
  }

  if (!ALLOWED_METHODS.has(method)) {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!allowedOriginSet.has(origin)) {
    return { statusCode: 403, body: 'Forbidden origin' };
  }

  // Strip the function base from the path
  const rawPath = (event.path || '').replace(/^\/\.netlify\/functions\/gh/, '') || '/';
  const isAllowedPath = ALLOWED_PATHS.some(p => rawPath === p || rawPath.startsWith(p));
  if (!isAllowedPath) {
    return { statusCode: 403, body: 'Path not allowed' };
  }

  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const url = `https://api.github.com${rawPath}${query}`;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'decap-netlify-proxy',
  };

  if (event.headers['content-type']) {
    headers['Content-Type'] = event.headers['content-type'];
  }

  const res = await fetch(url, {
    method,
    headers,
    body: ['GET','HEAD'].includes(method) ? undefined : event.body
  });

  const text = await res.text();
  return {
    statusCode: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    },
    body: text,
  };
}
