import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import apiDevServer from './vite-plugin-api-dev.ts';

const VENDOR_CHUNKS: ReadonlyArray<[chunk: string, match: string]> = [
  ['supabase', 'node_modules/@supabase/'],
  ['react', 'node_modules/react-dom/'],
];

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevServer()],
  // Stały port: adres przekierowania logowania Microsoft (Supabase, Redirect URLs) musi się zgadzać co do znaku.
  server: { port: 5173, strictPort: true },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const match = VENDOR_CHUNKS.find(([, needle]) => id.includes(needle));
          return match?.[0];
        },
      },
    },
  },
});
