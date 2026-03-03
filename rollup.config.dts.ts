import dts from "rollup-plugin-dts"

export default {
    input: "src/index.ts",
    output: [{ file: "lib/index.d.ts", format: "es" }],
    plugins: [dts()],
}
