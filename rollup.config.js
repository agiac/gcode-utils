import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";

export default [
  {
    input: "src/main.js",
    output: [
      { file: "dist/bundle.cjs.js", format: "cjs" },
      { file: "dist/bundle.esm.js", format: "es" },
      { file: "dist/bundle.umd.js", format: "umd", name: "GcodeUtils" },
    ],
    plugins: [
      babel({
        exclude: ["node_modules/**"],
      }),
      terser(),
    ],
  },
];
