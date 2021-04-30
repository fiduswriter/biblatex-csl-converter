import commonjs from "rollup-plugin-commonjs"
import globals from "rollup-plugin-node-globals"
import builtins from "rollup-plugin-node-builtins"
import resolve from "rollup-plugin-node-resolve"
import json from "rollup-plugin-json"
import babel from "rollup-plugin-babel"
import { terser } from "rollup-plugin-terser"

export default {
    plugins: [
        commonjs(),
        globals(),
        builtins(),
        resolve(),
        json(),
        babel({
            runtimeHelpers: true,
            exclude: "node_modules/**",
        }),
        terser(),
    ],
}
