// Used only for local development (npm run dev)
// Serves test.html with HMR so you can see widget changes live
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: '/test.html',
  },
});
