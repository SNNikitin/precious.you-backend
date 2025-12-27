import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types/**'],
    },
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10000,
    // Последовательно, чтобы не было race conditions с базой
    sequence: {
      hooks: 'list',
    },
  },
});
