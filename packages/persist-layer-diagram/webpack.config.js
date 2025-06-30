const path = require("path");
const webpack = require('webpack');
module.exports = {
  entry: "./src/index.tsx",
  target: "web",
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "PersistDiagram.js",
    library: "persistDiagram",
  },
  resolve: {
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
    alias: {
      handlebars: 'handlebars/dist/handlebars.min.js',
      "vscode": require.resolve('monaco-languageclient/lib/vscode-compatibility'),
      "crypto": false,
      "net": false,
      "os": false,
      "path": false,
      "fs": false,
      "child_process": false
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
        exclude: '/node_modules/'
      },
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(woff|woff2|ttf|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: './fonts/[name][ext]',
        },
      },
      {
        test: /\.(svg)$/,
        type: 'asset/resource',
        generator: {
          filename: './images/[name][ext]',
        },
      }
    ],
  },
  devServer: {
    allowedHosts: 'all',
    port: 9000,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    devMiddleware: {
      mimeTypes: { 'text/css': ['css'] },
    },
  }
};
