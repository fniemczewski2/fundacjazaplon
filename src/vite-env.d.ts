/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  // inne zmienne .env...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// DODAJEMY TO: Informujemy TypeScript, że w obiekcie window znajduje się gtag
interface Window {
  dataLayer: any[];
  gtag: (...args: any[]) => void;
}