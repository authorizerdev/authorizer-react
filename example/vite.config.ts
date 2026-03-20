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
        replacement: path.resolve(__dirname, '../dist/index.mjs'),
      },
      {
        find: 'authorizer-react/dist/styles.css',
        replacement: path.resolve(__dirname, '../dist/styles.css'),
      },
    ],
  },
});
