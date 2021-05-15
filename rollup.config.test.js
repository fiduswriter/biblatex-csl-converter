export default {
    input: "src/index.ts",
    output: {
        file: "tmp/bundle.test.js",
        format: "cjs",
    },
    plugins: [
        require("rollup-plugin-json")(),
        require("rollup-plugin-babel")({
            runtimeHelpers: true,
            exclude: "node_modules/**",
        }),
        require("rollup-plugin-istanbul")({
            exclude: ["test/*.js", "node_modules/**/*"],
        }),
        require("rollup-plugin-commonjs")(),
        require("@rollup/plugin-typescript")(),
        require("rollup-plugin-node-globals")(),
        require("rollup-plugin-node-builtins")(),
        require("rollup-plugin-node-resolve")(),
    ],
}
