import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const VENDOR_CHUNKS: ReadonlyArray<[chunk: string, match: string]> = [
  ['supabase', 'node_modules/@supabase/'],
  ['markdown', 'node_modules/react-markdown/'],
  ['react', 'node_modules/react-dom/'],
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
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