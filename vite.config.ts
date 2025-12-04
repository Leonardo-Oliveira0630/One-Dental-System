import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Force all "three" imports to resolve to the same local instance
        // This fixes the "Multiple instances of Three.js being imported" warning
        'three': path.resolve('./node_modules/three')
      }
    },
    define: {
      // Polyfill process.env.API_KEY for the browser build
      // This replaces 'process.env.API_KEY' in the code with the string value from env vars
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
  };
});