import type { ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMITS } from './config';
import type { ApiRequest } from './http';

const incrementWindow = vi.fn();

vi.mock('./redis', () => ({ incrementWindow: (...args: unknown[]) => incrementWindow(...args) }));
vi.mock('./securityEvents', () => ({ logSecurityEvent: vi.fn(async () => undefined) }));

const makeRes = () => {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: '',
    setHeader: (name: string, value: string) => void (headers[name] = value),
    end(body: string) {
      this.body = body;
    },
  };
  return { res, headers, asServer: res as unknown as ServerResponse };
};

const req = { headers: { 'x-forwarded-for': '203.0.113.9' } } as unknown as ApiRequest;

beforeEach(() => {
  incrementWindow.mockReset();
});

describe('rateLimited', () => {
  it('przepuszcza żądanie w limicie', async () => {
    incrementWindow.mockResolvedValue({ count: RATE_LIMITS.contact.limit, ttlSec: 100 });
    const { res, asServer } = makeRes();
    const { rateLimited } = await import('./rateLimit');
    await expect(rateLimited(req, asServer, 'contact')).resolves.toBe(false);
    expect(res.statusCode).toBe(0);
  });

  it('klucz zawiera nazwę limitu i skrót IP, a nie surowy adres', async () => {
    incrementWindow.mockResolvedValue({ count: 1, ttlSec: 100 });
    const { rateLimited } = await import('./rateLimit');
    await rateLimited(req, makeRes().asServer, 'contact');
    const [key, windowSec] = incrementWindow.mock.calls[0] as [string, number];
    expect(key).toMatch(/^rl:contact:[0-9a-f]{32}$/);
    expect(windowSec).toBe(RATE_LIMITS.contact.windowSec);
  });

  it('po przekroczeniu limitu zwraca 429 z Retry-After', async () => {
    incrementWindow.mockResolvedValue({ count: RATE_LIMITS.contact.limit + 1, ttlSec: 42 });
    const { res, headers, asServer } = makeRes();
    const { rateLimited } = await import('./rateLimit');
    await expect(rateLimited(req, asServer, 'contact')).resolves.toBe(true);
    expect(res.statusCode).toBe(429);
    expect(headers['Retry-After']).toBe('42');
  });

  it('gdy Redis nie działa, zwraca 503 (fail-closed)', async () => {
    incrementWindow.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { res, headers, asServer } = makeRes();
    const { rateLimited } = await import('./rateLimit');
    await expect(rateLimited(req, asServer, 'contact')).resolves.toBe(true);
    expect(res.statusCode).toBe(503);
    expect(headers['Retry-After']).toBe('30');
  });
});
