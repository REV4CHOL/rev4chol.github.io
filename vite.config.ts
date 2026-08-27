import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const p = (f: string) => fileURLToPath(new URL(f, import.meta.url));

export default defineConfig({
  appType: 'mpa',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: p('index.html'),
        works: p('works.html'),
        about: p('about.html'),
        contact: p('contact.html'),
        project: p('project.html'),
      },
    },
  },
});
