import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Backend (localhost:8080) and the app dev server (localhost:5173) are
  // expected to already be running - see docs/superpowers/plans for the
  // local-dev sequence. Not started here: this suite targets whatever's live,
  // matching how this session's MFA work has been manually verified so far.
});
