import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Testing Library only auto-cleans between tests when the global hooks
    // exist, otherwise renders stack up and queries hit multiple matches.
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
