import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
      {
        find: 'authorizer-react',
        replacement: path.resolve(__dirname, '../dist/authorizer-react.esm.js'),
      },
      {
        find: '@types/authorizer-react',
        replacement: path.resolve(__dirname, '../dist/types/index.d.ts'),
      },
    ],
  },
});
