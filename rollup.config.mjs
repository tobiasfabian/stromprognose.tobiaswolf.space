import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    file: 'assets/js/index.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [nodeResolve()],
};
