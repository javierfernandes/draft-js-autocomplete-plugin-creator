import path from 'path'
import fs from 'fs'
import HtmlWebpackPlugin from 'html-webpack-plugin'

module.exports = {
  entry: './app.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    inline: true,
    historyApiFallback: true,
    stats: {
      colors: true,
      hash: false,
      version: false,
      chunks: false,
      children: false
    }
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: [ 'babel' ],
        exclude: /node_modules/,
        include: __dirname
      },
      { test: /\.scss$/, loader: 'style!css!sass' },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html', // Load a custom template
      inject: 'body' // Inject all scripts into the body
    })
  ]
}

// This will make the draft-js-autocomplete-plugin-creator module resolve to the
// latest src instead of using it from npm. Remove this if running
// outside of the source.
const src = path.join(__dirname, '..', '..', 'src')
if (fs.existsSync(src)) {
  // Use the latest src
  module.exports.resolve = {
    root: [
      path.join(__dirname, 'node_modules'),
      path.join(__dirname, '..', '..', 'node_modules')
    ],
    alias: { 'draft-js-autocomplete-plugin-creator': src }
  };
  module.exports.module.loaders.push({
    test: /\.js$/,
    loaders: [ 'babel' ],
    include: src
  });
}
