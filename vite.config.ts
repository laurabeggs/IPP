import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    // The built site is committed and published by Netlify as-is, instead of
    // being built there. It deliberately avoids the name "dist", which the
    // repository's .gitignore files exclude.
    outDir: 'site-dist',
  },
});
