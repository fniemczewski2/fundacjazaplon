// Wysyłka poczty przez Microsoft Graph (uwierzytelnianie aplikacji: client credentials).
// Hosty domyślnie wskazują chmurę publiczną; MS_AUTHORITY_HOST / MS_GRAPH_HOST pozwalają je podmienić
// (chmury suwerenne, testy).

let cachedToken: { value: string; expiresAt: number } | null = null;

const firstLine = (value: unknown) => String(value ?? '').split(/\r?\n/)[0] ?? '';

async function getGraphToken(tenant: string, clientId: string, secret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const authority = process.env.MS_AUTHORITY_HOST || 'https://login.microsoftonline.com';
  const graph = process.env.MS_GRAPH_HOST || 'https://graph.microsoft.com';

  const res = await fetch(`${authority}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      scope: `${graph}/.default`,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const data: { access_token?: string; expires_in?: number | string; error?: string; error_description?: string } | null =
    await res.json().catch(() => null);

  if (!res.ok || !data?.access_token) {
    throw new Error(
      `Logowanie do Microsoft Graph nie powiodło się (${res.status}): ${firstLine(data?.error_description ?? data?.error) || 'brak szczegółów'}`,
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3000) * 1000,
  };
  return cachedToken.value;
}

export type GraphMail = { to: string; subject: string; html: string };

/** Rzuca wyjątek z czytelnym komunikatem, gdy konfiguracja jest niepełna albo Graph odrzuci żądanie. */
export async function sendGraphMail({ to, subject, html }: GraphMail): Promise<void> {
  const tenant = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const secret = process.env.MS_CLIENT_SECRET;
  const sender = process.env.MAIL_SENDER;
  if (!tenant || !clientId || !secret || !sender) {
    throw new Error('Brak konfiguracji Microsoft Graph (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MAIL_SENDER).');
  }

  const graph = process.env.MS_GRAPH_HOST || 'https://graph.microsoft.com';
  const replyTo = process.env.MAIL_REPLY_TO;

  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
    },
    saveToSentItems: true,
  };

  // Jedna ponowna próba po 401 - token mógł zostać unieważniony przed upływem ważności.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getGraphToken(tenant, clientId, secret);
    const res = await fetch(`${graph}/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 202) return;
    if (res.status === 401 && attempt === 0) {
      cachedToken = null;
      continue;
    }

    const err: { error?: { code?: string; message?: string } } | null = await res.json().catch(() => null);
    throw new Error(
      `Microsoft Graph sendMail (${res.status}): ${[err?.error?.code, firstLine(err?.error?.message)].filter(Boolean).join(' - ')}`,
    );
  }
}

export const escapeHtml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
