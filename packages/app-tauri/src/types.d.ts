/// <reference types="@tauri-apps/api" />

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

// Process environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
  }
}

export {};

