import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
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