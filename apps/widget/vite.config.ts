import { defineConfig } from 'vite';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [cssInjectedByJs()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'OnboardAI',
      fileName: 'widget',
      formats: ['iife'], // Immediately Invoked Function — works in any browser via <script> tag
    },
    rollupOptions: {
      output: {
        // No external deps — everything bundled into one file
        inlineDynamicImports: true,
      },
    },
    minify: true,
    outDir: '../../dist/widget',
  },
});
