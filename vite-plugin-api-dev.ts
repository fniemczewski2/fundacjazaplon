import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { loadEnv, type Plugin, type ResolvedConfig } from 'vite';

/**
 * Uruchamia funkcje z katalogu `api/` pod adresem `/api/*` w `npm run dev`.
 *
 * Na Vercelu każdy plik `api/<nazwa>.ts` jest osobną funkcją, a sam `vite dev` ich nie obsługuje
 * (zwraca 404 albo `index.html`). Ten plugin odtwarza to lokalnie, tylko w trybie `serve`:
 * w `vite build` nie robi nic i nie trafia do paczki.
 *
 * Odwzorowanie Vercela jest celowo wąskie:
 * - `req.body`: JSON i application/x-www-form-urlencoded są parsowane, reszta zostaje tekstem,
 * - `req.query`: parametry zapytania,
 * - plik `api/_nazwa.ts` (z podkreśleniem) nie jest trasą, tak jak na Vercelu,
 * - brak helperów `res.status()`/`res.json()` - istniejące funkcje używają czystego API Node.
 *
 * Zmienne środowiskowe z `.env*` (także te bez prefiksu `VITE_`, np. SUPABASE_SERVICE_ROLE_KEY)
 * trafiają do `process.env` serwera deweloperskiego. Nie wpływa to na paczkę dla przeglądarki,
 * a zmienne ustawione już w systemie mają pierwszeństwo.
 */

const MAX_BODY_BYTES = 4_500_000; // jak limit funkcji na Vercelu
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const EXTENSIONS = ['.ts', '.js', '.mjs'] as const;

class BodyTooLargeError extends Error {}

type ApiRequest = IncomingMessage & { body?: unknown; query?: Record<string, string> };
type ApiHandler = (req: ApiRequest, res: ServerResponse) => unknown;

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) tooLarge = true; // dalej opróżniamy strumień, żeby móc odpowiedzieć
      else chunks.push(chunk);
    });
    req.on('end', () => (tooLarge ? reject(new BodyTooLargeError()) : resolve(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

function parseBody(raw: string, contentType: string): unknown {
  if (!raw) return undefined;
  if (contentType.includes('application/json')) return JSON.parse(raw);
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return raw;
}

export default function apiDevServer(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'api-dev-server',
    apply: 'serve',

    configResolved(resolved) {
      config = resolved;
      if (resolved.envDir === false) return;

      const fileEnv = loadEnv(resolved.mode, resolved.envDir || resolved.root, '');
      for (const [key, value] of Object.entries(fileEnv)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    },

    configureServer(server) {
      const host = config.server.host;
      if (host === true || (typeof host === 'string' && !['localhost', '127.0.0.1', '::1'].includes(host))) {
        config.logger.warn(
          '[api-dev-server] Serwer nasłuchuje poza localhost. Funkcje z api/ mają dostęp do kluczy z .env* ' +
            '(m.in. SUPABASE_SERVICE_ROLE_KEY) i będą dostępne dla urządzeń w sieci.',
        );
      }
      config.logger.info('  api: funkcje z katalogu api/ działają pod /api/* (tylko tryb deweloperski)');

      const handle = async (req: ApiRequest, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        // `use('/api')` obcina prefiks: '/decide-settlement' -> 'decide-settlement'. Bez dekodowania
        // procentowego, więc '..' i '%2e%2e' nie przejdą przez NAME_RE.
        const name = url.pathname.replace(/^\/+/, '');
        const ext = NAME_RE.test(name)
          ? EXTENSIONS.find((e) => existsSync(path.join(config.root, 'api', `${name}${e}`)))
          : undefined;

        if (!ext) return sendJson(res, 404, { error: 'Nie znaleziono funkcji API.' });

        try {
          const raw = await readBody(req);
          req.body = parseBody(raw, String(req.headers['content-type'] ?? ''));
        } catch (err) {
          if (err instanceof BodyTooLargeError) return sendJson(res, 413, { error: 'Zbyt duże żądanie.' });
          return sendJson(res, 400, { error: 'Nieprawidłowy format żądania.' });
        }
        req.query = Object.fromEntries(url.searchParams);

        try {
          // ssrLoadModule przetwarza TypeScript i unieważnia moduł po edycji pliku - bez restartu.
          const mod = (await server.ssrLoadModule(`/api/${name}${ext}`)) as { default?: ApiHandler };
          if (typeof mod.default !== 'function') {
            return sendJson(res, 500, { error: 'Funkcja API nie eksportuje handlera (export default).' });
          }
          await mod.default(req, res);
          if (!res.writableEnded) res.end();
        } catch (err) {
          if (err instanceof Error) server.ssrFixStacktrace(err);
          config.logger.error(`[api-dev-server] /api/${name}: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
          sendJson(res, 500, { error: 'Błąd funkcji API (szczegóły w konsoli serwera).' });
        }
      };

      server.middlewares.use('/api', (req, res) => {
        void handle(req as ApiRequest, res);
      });
    },
  };
}
