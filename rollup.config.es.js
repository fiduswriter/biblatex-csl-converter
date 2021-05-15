import typescript from "@rollup/plugin-typescript"

export default {
    input: "src/index.ts",
    output: {
        sourcemap: true,
    },
    plugins: [typescript({ sourceMap: true })],
}
