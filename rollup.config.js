import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'src/main.ts',
    output: [
      { file: 'dist/bundle.cjs.js', format: 'cjs' },
      { file: 'dist/bundle.esm.js', format: 'es' },
      { file: 'dist/bundle.umd.js', format: 'umd', name: 'GcodeUtils' },
    ],
    plugins: [
      resolve({ extensions: ['.ts'] }),
      commonjs(),
      babel({
        extensions: ['.ts'],
        exclude: ['node_modules/**'],
      }),
      terser(),
    ],
  },
];
