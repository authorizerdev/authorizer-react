import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // WebAuthn's RP origin check requires the frontend and backend to share
    // an origin (see authorizer's internal/authenticators/webauthn/webauthn.go
    // newRP: RPOrigins is derived from the *backend's* own request host,
    // matching web/app's real deployment - bundled into the same origin as
    // the API). Proxying keeps the browser on a single origin (:5173) for
    // local dev while still hitting the real backend on :8080 - Vite's proxy
    // preserves the original Host header by default, so the backend derives
    // HostURL as localhost:5173 too, matching what the browser actually used
    // for the WebAuthn ceremony. Combine with authorizerURL pointed at the
    // same origin (see src/index.tsx) - both sides of this only matter for
    // testing passkeys locally; every other MFA method works fine without it.
    proxy: {
      '/graphql': 'http://localhost:8080',
      '/v1': 'http://localhost:8080',
    },
  },
  resolve: {
    alias: [
      {
        find: 'authorizer-react',
        replacement: path.resolve(__dirname, '../dist/index.mjs'),
      },
      {
        find: 'authorizer-react/dist/styles.css',
        replacement: path.resolve(__dirname, '../dist/styles.css'),
      },
    ],
  },
});
