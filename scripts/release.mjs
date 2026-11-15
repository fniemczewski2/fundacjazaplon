#!/usr/bin/env node
// Wydanie: sprawdzenia -> podniesienie wersji -> podsumowanie -> (po potwierdzeniu) commit i push.
//
//   npm run release                    # wersja patch (x.y.Z)
//   npm run release -- --minor         # x.Y.0
//   npm run release -- --major         # X.0.0
//   npm run release -- --yes           # bez pytania o potwierdzenie
//   npm run release -- --dry-run       # tylko sprawdzenia i podgląd; nic nie jest zapisywane ani wysyłane
//   npm run release -- --only=lint,test  # tylko wybrane sprawdzenia (format, lint, typecheck, test, build)
//
// Zmiany w bazie (supabase/migrations/*.sql) trzeba uruchomić ręcznie w Supabase przed wdrożeniem kodu,
// który z nich korzysta. Skrypt tylko je wypisuje.

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const args = new Set(process.argv.slice(2));
const flag = (name) => args.has(`--${name}`);
const only = process.argv
  .slice(2)
  .find((a) => a.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DRY = flag('dry-run');
const YES = flag('yes');
const BUMP = flag('major') ? 'major' : flag('minor') ? 'minor' : 'patch';

const out = (text = '') => process.stdout.write(`${text}\n`);
const fail = (text) => {
  process.stderr.write(`\n${text}\n`);
  process.exit(1);
};

const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// Zmienne potrzebne tylko do tego, żeby build przeszedł (klucze publiczne, bez znaczenia dla wyniku).
const BUILD_ENV = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'anon-key-for-build-check',
};

const SOURCE_RE = /\.(?:[cm]?[jt]sx?|json|css|md)$/;
const FORMAT_ROOTS = /^(?:src|api|shared|scripts)\//;

/** Sprawdza formatowanie tylko plików zmienionych względem HEAD (reszta repozytorium nie jest jeszcze sformatowana). */
function changedFormatTargets() {
  const tracked = git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD').split('\n');
  const untracked = git('ls-files', '--others', '--exclude-standard').split('\n');
  return [...new Set([...tracked, ...untracked])].filter(
    (f) => f && FORMAT_ROOTS.test(f) && SOURCE_RE.test(f),
  );
}

const CHECKS = [
  {
    key: 'format',
    label: 'Prettier (zmienione pliki)',
    run: () => {
      const files = changedFormatTargets();
      if (files.length === 0) return { skipped: 'brak zmienionych plików' };
      return {
        cmd: ['npx', 'prettier', '--check', ...files],
        summary: () => `${files.length} plików`,
      };
    },
  },
  {
    key: 'lint',
    label: 'Lint (oxlint)',
    run: () => ({
      cmd: ['npm', 'run', '-s', 'lint'],
      summary: (o) => /Found .*/.exec(o)?.[0] ?? 'ok',
    }),
  },
  {
    key: 'typecheck',
    label: 'Typy (tsc)',
    run: () => ({ cmd: ['npm', 'run', '-s', 'typecheck'], summary: () => 'ok' }),
  },
  {
    key: 'test',
    label: 'Testy (vitest)',
    run: () => ({
      cmd: ['npm', 'run', '-s', 'test'],
      summary: (o) => /Tests\s+.*/.exec(o)?.[0].replaceAll(/\s+/g, ' ') ?? 'ok',
    }),
  },
  {
    key: 'build',
    label: 'Build (vite)',
    run: () => ({
      cmd: ['npx', 'vite', 'build'],
      env: BUILD_ENV,
      summary: (o) => /built in .*/.exec(o)?.[0] ?? 'ok',
    }),
  },
];

const unknown = (only ?? []).filter((k) => !CHECKS.some((c) => c.key === k));
if (unknown.length > 0)
  fail(
    `Nieznane sprawdzenie w --only: ${unknown.join(', ')}. Dostępne: ${CHECKS.map((c) => c.key).join(', ')}.`,
  );

// --- stan repozytorium ---
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch === 'HEAD') fail('Odłączony HEAD (detached). Przejdź na gałąź przed wydaniem.');
if (git('status', '--porcelain') === '') fail('Brak zmian do wydania.');

out(`Gałąź: ${branch}${DRY ? '  [dry-run]' : ''}`);
out('');

// --- sprawdzenia ---
const results = [];
for (const check of CHECKS) {
  if (only && !only.includes(check.key)) continue;
  const plan = check.run();
  if (plan.skipped) {
    results.push({ label: check.label, status: 'pominięto', detail: plan.skipped });
    out(`-  ${check.label}: pominięto (${plan.skipped})`);
    continue;
  }
  const [bin, ...binArgs] = plan.cmd;
  const started = Date.now();
  const run = spawnSync(bin, binArgs, {
    encoding: 'utf8',
    env: { ...process.env, ...plan.env },
    shell: process.platform === 'win32', // npm/npx to pliki .cmd; argumenty są stałe lub nazwy plików z git
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (run.status !== 0) {
    out(`x  ${check.label}: BŁĄD (${seconds}s)`);
    out(output.trim().split('\n').slice(-40).join('\n'));
    fail('Wydanie przerwane: popraw błędy i uruchom ponownie.');
  }
  const detail = plan.summary(output);
  results.push({ label: check.label, status: 'ok', detail });
  out(`ok ${check.label}: ${detail} (${seconds}s)`);
}

// --- wersja ---
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [major = 0, minor = 0, patch = 0] = String(pkg.version)
  .split('.')
  .map((n) => Number.parseInt(n, 10) || 0);
const next =
  BUMP === 'major'
    ? `${major + 1}.0.0`
    : BUMP === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

// --- podsumowanie zmian ---
const files = git('status', '--porcelain')
  .split('\n')
  .map((line) =>
    line
      .slice(3)
      .replace(/^.* -> /, '')
      .replaceAll('"', ''),
  )
  .filter(Boolean);
const migrations = files.filter((f) => f.startsWith('supabase/migrations/'));
const areas = new Map();
for (const f of files) {
  const area = f.includes('/') ? f.split('/')[0] : '(root)';
  areas.set(area, (areas.get(area) ?? 0) + 1);
}

const message = [
  `release: v${next}`,
  '',
  `Zmienione pliki: ${files.length} (${[...areas].map(([a, n]) => `${a}: ${n}`).join(', ')})`,
  ...(migrations.length > 0
    ? ['', 'Migracje do uruchomienia w Supabase:', ...migrations.map((m) => `- ${m}`)]
    : []),
  '',
  'Sprawdzenia:',
  ...results.map((r) => `- ${r.label}: ${r.status}${r.detail ? ` (${r.detail})` : ''}`),
].join('\n');

out('');
out(`Wersja: ${pkg.version} -> ${next} (${BUMP})`);
out(`Pliki: ${files.length}`);
for (const [area, n] of areas) out(`  ${area}: ${n}`);
if (migrations.length > 0) {
  out('');
  out('UWAGA: nowe migracje SQL. Uruchom je w Supabase przed wdrożeniem kodu:');
  for (const m of migrations) out(`  - ${m}`);
}
out('');
out('--- komunikat commita ---');
out(message);
out('-------------------------');

if (DRY) {
  out('');
  out('Dry-run: nie zmieniono wersji, nie wykonano commita ani pushu.');
  process.exit(0);
}

if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`\nWykonać commit i push na "${branch}"? [t/N] `))
    .trim()
    .toLowerCase();
  rl.close();
  if (!['t', 'tak', 'y', 'yes'].includes(answer)) fail('Anulowano. Wersja nie została zmieniona.');
}

// --- zapis wersji, commit, push ---
pkg.version = next;
writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

git('add', '-A');
git('commit', '-m', message);
out(`\nCommit: ${git('rev-parse', '--short', 'HEAD')}`);

let hasUpstream = true;
try {
  git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
} catch {
  hasUpstream = false;
}
execFileSync('git', hasUpstream ? ['push'] : ['push', '-u', 'origin', branch], {
  stdio: 'inherit',
});
out(`Wydano v${next}.`);
