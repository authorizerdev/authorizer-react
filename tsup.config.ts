import { defineConfig } from 'tsup';
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false, // Let consumers minify if needed
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  esbuildOptions(options: any) {
    options.jsx = 'automatic';
  },
  outDir: 'dist',
  outExtension({ format }: { format: string }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
  // Don't bundle CSS - export it separately
  loader: {
    '.css': 'empty',
  },
  onSuccess: async () => {
    // Copy CSS file to dist after build
    const cssSource = join(process.cwd(), 'src/styles/default.css');
    const cssDest = join(process.cwd(), 'dist/styles.css');
    if (existsSync(cssSource)) {
      copyFileSync(cssSource, cssDest);
      console.log('✓ Copied styles.css to dist');
    }
  },
});
