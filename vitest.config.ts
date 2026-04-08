import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/live/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      // Excluded:
      //  - index.ts: barrel re-exports only, no logic
      //  - types.ts: type declarations + thin HoroscopeError class
      //  - scrapers/interface.ts: type-only contract (0 runtime statements)
      exclude: ['src/index.ts', 'src/types.ts', 'src/scrapers/interface.ts'],
      // Ratchet floor — set at current coverage with a small buffer.
      // CI fails if any of these drops; tighten the numbers as new tests land.
      thresholds: {
        statements: 92,
        branches: 82,
        functions: 92,
        lines: 92,
      },
    },
  },
});
