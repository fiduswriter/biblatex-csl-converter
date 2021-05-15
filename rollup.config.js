import commonjs from "@rollup/plugin-commonjs"
import globals from "rollup-plugin-node-globals"
import builtins from "rollup-plugin-node-builtins"
import resolve from "@rollup/plugin-node-resolve"
import json from "@rollup/plugin-json"
import babel from "@rollup/plugin-babel"
import typescript from "@rollup/plugin-typescript"
import { terser } from "rollup-plugin-terser"

export default {
    input: "src/index.ts",
    output: {
        sourcemap: true,
    },
    plugins: [
        commonjs(),
        typescript({ sourceMap: true }),
        globals(),
        builtins(),
        resolve(),
        json(),
        babel({
            babelHelpers: "runtime",
            exclude: "node_modules/**",
        }),
        terser(),
    ],
}
