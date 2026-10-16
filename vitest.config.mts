import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // JSX automatique (comme Next.js) pour pouvoir tester des composants.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
