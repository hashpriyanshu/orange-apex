import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  publicDir: 'public'
});
