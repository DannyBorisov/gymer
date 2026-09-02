/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_RC_IOS_KEY: string;
  readonly VITE_RC_ANDROID_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
