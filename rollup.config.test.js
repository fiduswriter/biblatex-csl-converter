import commonjs from "@rollup/plugin-commonjs"
import globals from "rollup-plugin-node-globals"
import nodePolyfills from "rollup-plugin-polyfill-node"
import resolve from "@rollup/plugin-node-resolve"
import json from "@rollup/plugin-json"
import babel from "@rollup/plugin-babel"
import typescript from "@rollup/plugin-typescript"
import istanbul from "rollup-plugin-istanbul"

export default {
    input: "src/index.ts",
    output: {
        file: "tmp/bundle.test.js",
        format: "cjs",
    },
    plugins: [
        commonjs(),
        typescript({ sourceMap: false }),
        nodePolyfills({ sourceMap: false }),
        globals(),
        resolve(),
        json(),
        babel({
            babelHelpers: "runtime",
            exclude: "node_modules/**",
        }),
        istanbul({
            exclude: ["test/*.js", "node_modules/**/*"],
        }),
    ],
}
