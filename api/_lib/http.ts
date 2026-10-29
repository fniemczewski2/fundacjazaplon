import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ApiRequest extends IncomingMessage {
  body?: any;
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function sendPdf(res: ServerResponse, bytes: Uint8Array, filename: string) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(Buffer.from(bytes));
}

/** Adres klienta. Na Vercelu nagłówek x-forwarded-for ustawia platforma. */
export function clientIp(req: IncomingMessage): string {
  const header = req.headers['x-forwarded-for'];
  const first = (Array.isArray(header) ? header[0] : header)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'nieznany';
}

export const shorten = (value: unknown, max = 300) =>
  (value instanceof Error ? value.message : String(value)).slice(0, max);
