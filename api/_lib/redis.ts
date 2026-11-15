import { Redis } from '@upstash/redis';

/** Redis jest wymagany: limity żądań i licznik prób OTP działają fail-closed (brak Redis = odmowa, nie brak limitu). */
export class RedisUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RedisUnavailableError';
  }
}

let client: Redis | null = null;

/** Upstash Redis przez REST. Nazwy KV_REST_API_* pochodzą z integracji Upstash w Vercel Marketplace. */
export function getRedis(): Redis {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token)
    throw new RedisUnavailableError('Brak UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.');
  client = new Redis({ url, token, retry: { retries: 1, backoff: () => 100 } });
  return client;
}

// Atomowo: zwiększenie licznika i ustawienie wygaśnięcia przy pierwszym trafieniu. Gdyby klucz z jakiegoś powodu
// nie miał TTL (-1), wygaśnięcie jest ustawiane ponownie, więc licznik nigdy nie blokuje na stałe.
const INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

/** Zwiększa licznik `key` (okno `windowSec` sekund od pierwszego trafienia). Zwraca bieżącą wartość i pozostały czas. */
export async function incrementWindow(
  key: string,
  windowSec: number,
): Promise<{ count: number; ttlSec: number }> {
  try {
    const result = await getRedis().eval<[string], [number, number]>(
      INCR_SCRIPT,
      [key],
      [String(windowSec)],
    );
    const [count, ttl] = result;
    if (typeof count !== 'number' || typeof ttl !== 'number')
      throw new Error('Nieoczekiwana odpowiedź Redis.');
    return { count, ttlSec: ttl };
  } catch (err) {
    if (err instanceof RedisUnavailableError) throw err;
    throw new RedisUnavailableError('Błąd Redis.', { cause: err });
  }
}
