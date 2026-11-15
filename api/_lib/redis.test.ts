import { beforeEach, describe, expect, it, vi } from 'vitest';

const evalMock = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class {
    eval = evalMock;
  },
}));

describe('incrementWindow', () => {
  beforeEach(() => {
    vi.resetModules();
    evalMock.mockReset();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.stubEnv('KV_REST_API_URL', '');
    vi.stubEnv('KV_REST_API_TOKEN', '');
  });

  it('zwraca licznik i pozostały czas', async () => {
    evalMock.mockResolvedValue([3, 120]);
    const { incrementWindow } = await import('./redis');
    await expect(incrementWindow('k', 3600)).resolves.toEqual({ count: 3, ttlSec: 120 });
    expect(evalMock).toHaveBeenCalledWith(expect.any(String), ['k'], ['3600']);
  });

  it('błąd Redis zamienia na RedisUnavailableError (fail-closed)', async () => {
    evalMock.mockRejectedValue(new Error('timeout'));
    const { incrementWindow, RedisUnavailableError } = await import('./redis');
    await expect(incrementWindow('k', 60)).rejects.toBeInstanceOf(RedisUnavailableError);
  });

  it('nieoczekiwana odpowiedź jest traktowana jako awaria', async () => {
    evalMock.mockResolvedValue(['x', 'y']);
    const { incrementWindow, RedisUnavailableError } = await import('./redis');
    await expect(incrementWindow('k', 60)).rejects.toBeInstanceOf(RedisUnavailableError);
  });

  it('brak konfiguracji = RedisUnavailableError', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const { incrementWindow, RedisUnavailableError } = await import('./redis');
    await expect(incrementWindow('k', 60)).rejects.toBeInstanceOf(RedisUnavailableError);
    expect(evalMock).not.toHaveBeenCalled();
  });
});
