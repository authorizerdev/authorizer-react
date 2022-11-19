import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'authorizer-react',
        replacement: path.resolve(__dirname, '../dist/authorizer-react.esm.js'),
      },
    ],
  },
});
