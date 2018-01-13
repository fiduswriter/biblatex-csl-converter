module.exports = {

  plugins: [
    require('rollup-plugin-commonjs')(),
    require('rollup-plugin-node-globals')(),
    require('rollup-plugin-node-builtins')(),
    require('rollup-plugin-node-resolve')(),
    require('rollup-plugin-json')(),
    require('rollup-plugin-babel')({
        runtimeHelpers: true,
        exclude: 'node_modules/**',
        presets: [
          [
            "env",
            {
              modules: false,
              targets: {
                browsers: [
                  "last 2 versions",
                  "ie >= 10"
                ],
                node: "current"
              }
            }
          ]
        ],
        plugins: [
          "transform-runtime"
        ],
        env: {
          development: {
            plugins: [
              "istanbul"
            ]
          }
        }
    }),
    require('rollup-plugin-uglify-es')()
  ]
}
