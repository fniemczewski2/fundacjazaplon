import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Vercel Hobby: maks. 12 funkcji. Funkcją jest każdy plik .ts/.js w api/ (także w podkatalogach) poza ścieżkami z "_".
// Testy i moduły pomocnicze muszą leżeć w katalogach zaczynających się od "_" (np. api/_lib, api/_tests).
const HOBBY_LIMIT = 12;

function functionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('_')) return [];
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return functionFiles(path);
    return /\.(?:[cm]?[jt]s|tsx?)$/.test(entry.name) ? [path] : [];
  });
}

describe('funkcje Vercel', () => {
  const files = functionFiles('api');

  it(`jest ich nie więcej niż ${HOBBY_LIMIT}`, () => {
    expect(files, files.join('\n')).toHaveLength(Math.min(files.length, HOBBY_LIMIT));
  });

  it('żaden plik testowy nie leży poza ścieżką z "_"', () => {
    expect(files.filter((f) => f.includes('.test.'))).toEqual([]);
  });
});
