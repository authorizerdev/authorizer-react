import { defineConfig } from 'tsup';

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
  // CSS files will be bundled as text
  loader: {
    '.css': 'text',
  },
});
