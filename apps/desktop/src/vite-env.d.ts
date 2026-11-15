// path: apps/desktop/src/vite-env.d.ts
// purpose: Types for Vite client features and the app's environment variables.
/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_WEB_URL: string }
interface ImportMeta { readonly env: ImportMetaEnv }
