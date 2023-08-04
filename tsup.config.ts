import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts', 'src/ct-test-plugin.ts', 'src/global-setup.ts'],
  splitting: false,
  // minify: !options.watch,
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  treeshake: true,
  sourcemap: true,
  clean: true,
  platform: 'node',
  esbuildOptions(options) {
    options.conditions = ['module'];
  },
  external: [/\.\/global-setup/],
}));
