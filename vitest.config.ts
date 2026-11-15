import { defineConfig } from 'vitest/config';

// Osobna konfiguracja (bez wtyczek Vite): testy dotyczą logiki czystej i funkcji serwerowych, nie interfejsu.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'api/**/*.test.ts', 'src/lib/**/*.test.ts'],
    env: {
      AGREEMENTS_SECRET: 'test-secret-do-not-use-in-production',
      // 32 bajty (same zera) w base64 - wyłącznie na potrzeby testów.
      AGREEMENTS_PII_KEY: Buffer.alloc(32).toString('base64'),
    },
    restoreMocks: true,
  },
});
