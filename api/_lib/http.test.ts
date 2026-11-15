import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { asString, bodyOf, clientIp, sendJson, shorten, type ApiRequest } from './http';

const req = (partial: Record<string, unknown>) => partial as unknown as ApiRequest;

describe('bodyOf', () => {
  it('zwraca obiekt, a dla innych typów pusty obiekt', () => {
    expect(bodyOf(req({ body: { a: 1 } }))).toEqual({ a: 1 });
    expect(bodyOf(req({ body: [1] }))).toEqual({});
    expect(bodyOf(req({ body: 'x' }))).toEqual({});
    expect(bodyOf(req({ body: null }))).toEqual({});
    expect(bodyOf(req({}))).toEqual({});
  });
});

describe('asString', () => {
  it('przycina białe znaki i długość, nie-teksty zamienia na pusty', () => {
    expect(asString('  abcdef  ', 3)).toBe('abc');
    expect(asString(5, 10)).toBe('');
    expect(asString(undefined, 10)).toBe('');
  });
});

describe('clientIp', () => {
  const incoming = (headers: Record<string, string | string[]>, remote?: string) =>
    ({ headers, socket: { remoteAddress: remote } }) as unknown as IncomingMessage;

  it('bierze pierwszy adres z x-forwarded-for', () => {
    expect(clientIp(incoming({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' }))).toBe('203.0.113.1');
    expect(clientIp(incoming({ 'x-forwarded-for': ['203.0.113.2'] }))).toBe('203.0.113.2');
  });

  it('wraca do adresu gniazda, a na końcu do wartości zastępczej', () => {
    expect(clientIp(incoming({}, '127.0.0.1'))).toBe('127.0.0.1');
    expect(clientIp(incoming({}))).toBe('nieznany');
  });
});

describe('sendJson', () => {
  it('ustawia status, nagłówki i serializuje ciało', () => {
    const headers: Record<string, string> = {};
    let ended = '';
    const res = {
      statusCode: 0,
      setHeader: (name: string, value: string) => void (headers[name] = value),
      end: (body: string) => void (ended = body),
    } as unknown as ServerResponse;

    sendJson(res, 429, { error: 'x' }, { 'Retry-After': '30' });

    expect(res.statusCode).toBe(429);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['Retry-After']).toBe('30');
    expect(JSON.parse(ended)).toEqual({ error: 'x' });
  });
});

describe('shorten', () => {
  it('skraca komunikat błędu i dowolną wartość', () => {
    expect(shorten(new Error('abcdef'), 3)).toBe('abc');
    expect(shorten(12345, 2)).toBe('12');
  });
});
