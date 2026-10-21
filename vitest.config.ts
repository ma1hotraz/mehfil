import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/shared/**',
        'src/server/**',
        'src/client/lib/**',
        'src/client/components/**',
        'src/client/features/**',
      ],
      exclude: ['src/server/index.ts', 'src/client/main.tsx', '**/*.d.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
        'src/shared/engine/**': { lines: 98, branches: 95 },
      },
    },
  },
});
