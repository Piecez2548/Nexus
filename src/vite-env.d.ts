/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    documentPictureInPicture?: { requestWindow: (options?: { width?: number; height?: number }) => Promise<Window> };
  }
}

export {};

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_AI_PROVIDER: string;
  readonly VITE_AI_API_KEY: string;
  readonly VITE_AI_ENDPOINT: string;
  readonly VITE_AI_MODEL: string;
  readonly VITE_AI_TIMEOUT_MS: string;
  readonly VITE_NEXUS_SCANNER_SAFE_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
