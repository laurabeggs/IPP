import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    // Bento ships single-file components and imports its own CSS from inside
    // the package, so the tests have to process it instead of leaving it to
    // Node, which cannot load a stylesheet.
    server: { deps: { inline: [/@adyen\//] } },
    setupFiles: ['src/tests/setup.ts'],
  },
  build: {
    // The built site is committed and published by Netlify as-is, instead of
    // being built there. It deliberately avoids the name "dist", which the
    // repository's .gitignore files exclude.
    outDir: 'site-dist',
  },
});
