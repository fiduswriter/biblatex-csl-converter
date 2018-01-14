module.exports = {

  plugins: [
    require('rollup-plugin-commonjs')(),
    require('rollup-plugin-node-globals')(),
    require('rollup-plugin-node-builtins')(),
    require('rollup-plugin-node-resolve')(),
    require('rollup-plugin-json')(),
    require('rollup-plugin-babel')({
        runtimeHelpers: true,
        exclude: 'node_modules/**'
    }),
    require('rollup-plugin-uglify-es')()
  ]
}
