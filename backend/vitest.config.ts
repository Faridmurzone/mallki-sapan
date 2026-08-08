import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Sólo el código fuente: dist/ tiene los mismos tests ya compilados.
    include: ['src/**/*.test.ts'],
  },
});
