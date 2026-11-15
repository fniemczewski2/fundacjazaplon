import type { ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiRequest } from './_lib/http';

const retrieve = vi.fn();
const createPortal = vi.fn();
const rateLimited = vi.fn();
let stripeConfigured = true;

vi.mock('./_lib/auth', () => ({ serviceClient: vi.fn(), supabaseEnv: () => null }));
vi.mock('./_lib/rateLimit', () => ({ rateLimited: (...args: unknown[]) => rateLimited(...args) }));
vi.mock('./_lib/stripe', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getStripe: () =>
    stripeConfigured
      ? {
          checkout: { sessions: { retrieve } },
          billingPortal: { sessions: { create: createPortal } },
        }
      : null,
}));

const VALID_ID = `cs_live_${'a'.repeat(40)}`;

const call = async (method: string, body?: unknown) => {
  const res = {
    statusCode: 0,
    body: '',
    setHeader: () => undefined,
    end(b: string) {
      this.body = b;
    },
  };
  const { default: handler } = await import('./stripe-portal');
  await handler({ method, body } as unknown as ApiRequest, res as unknown as ServerResponse);
  return {
    status: res.statusCode,
    json: res.body ? (JSON.parse(res.body) as Record<string, unknown>) : null,
  };
};

const completeSession = (over: Record<string, unknown> = {}) => ({
  mode: 'subscription',
  status: 'complete',
  customer: 'cus_123',
  created: Math.floor(Date.now() / 1000) - 60,
  ...over,
});

beforeEach(() => {
  stripeConfigured = true;
  rateLimited.mockReset().mockResolvedValue(false);
  retrieve.mockReset();
  createPortal.mockReset().mockResolvedValue({ url: 'https://billing.stripe.com/p/session/x' });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('POST /api/stripe-portal', () => {
  it('405 dla metody innej niż POST', async () => {
    expect((await call('GET')).status).toBe(405);
  });

  it('503 bez konfiguracji Stripe', async () => {
    stripeConfigured = false;
    expect((await call('POST', { sessionId: VALID_ID })).status).toBe(503);
  });

  it('kończy się, gdy limit żądań został przekroczony', async () => {
    rateLimited.mockResolvedValue(true);
    const { status } = await call('POST', { sessionId: VALID_ID });
    expect(status).toBe(0); // odpowiedź wysłał rateLimited
    expect(retrieve).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'cs_test_' + 'a'.repeat(40), 'cs_live_x', 123])(
    '400 dla nieprawidłowego identyfikatora %j (bez zapytania do Stripe)',
    async (sessionId) => {
      expect((await call('POST', { sessionId })).status).toBe(400);
      expect(retrieve).not.toHaveBeenCalled();
    },
  );

  it('400 dla sesji, która nie jest zakończoną subskrypcją', async () => {
    retrieve.mockResolvedValue(completeSession({ mode: 'payment' }));
    expect((await call('POST', { sessionId: VALID_ID })).status).toBe(400);
    retrieve.mockResolvedValue(completeSession({ status: 'open' }));
    expect((await call('POST', { sessionId: VALID_ID })).status).toBe(400);
    retrieve.mockResolvedValue(completeSession({ customer: null }));
    expect((await call('POST', { sessionId: VALID_ID })).status).toBe(400);
  });

  it('410 po upływie 24 godzin', async () => {
    retrieve.mockResolvedValue(
      completeSession({ created: Math.floor(Date.now() / 1000) - 24 * 3600 - 10 }),
    );
    const { status, json } = await call('POST', { sessionId: VALID_ID });
    expect(status).toBe(410);
    expect(json?.expired).toBe(true);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it('200 z adresem panelu dla ważnej sesji', async () => {
    retrieve.mockResolvedValue(completeSession());
    const { status, json } = await call('POST', { sessionId: VALID_ID });
    expect(status).toBe(200);
    expect(json?.url).toBe('https://billing.stripe.com/p/session/x');
    expect(createPortal).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_123' }));
  });

  it('akceptuje klienta jako obiekt', async () => {
    retrieve.mockResolvedValue(completeSession({ customer: { id: 'cus_obj' } }));
    await call('POST', { sessionId: VALID_ID });
    expect(createPortal).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_obj' }));
  });

  it('502 przy błędzie Stripe', async () => {
    retrieve.mockRejectedValue(new Error('stripe down'));
    expect((await call('POST', { sessionId: VALID_ID })).status).toBe(502);
  });
});
