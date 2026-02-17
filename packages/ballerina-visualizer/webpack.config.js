const path = require("path");
const webpack = require('webpack');

module.exports = {
  entry: "./src/index.tsx",
  target: "web",
  devtool: !process.env.CI ? "eval-source-map" : undefined,
  mode: !process.env.CI ? "development" : "production",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "Visualizer.js",
    library: "visualizerWebview",
  },
  resolve: {
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'vscode': path.resolve(__dirname, 'node_modules/vscode-uri'),
      "crypto": false,
      "net": false,
      "os": false,
      "path": false,
      "fs": false,
      "child_process": false,
    },
    fullySpecified: false
  },
  module: {
    rules: [{
      test: /\.(ts|tsx)$/,
      loader: "ts-loader",
      exclude: '/node_modules/',
      options: {
        configFile: path.resolve(__dirname, 'tsconfig.json'),
      },
    },
    {
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      }
    },
    {
      enforce: "pre",
      test: /\.js$/,
      loader: "source-map-loader",
      exclude: [
        /node_modules\/parse5/,
        /node_modules\/autolinker/
      ],
    },
    {
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader'
      ]
    },
    {
      test: /\.s[ac]ss$/i,
      use: [
        // Creates `style` nodes from JS strings
        'style-loader',
        // Translates CSS into CommonJS
        'css-loader',
        // Compiles Sass to CSS
        'sass-loader',
      ],
    },
    {
      test: /\.(woff|woff2|ttf|otf|eot)$/,
      type: 'asset/inline',
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
      mimeTypes: {
        'text/css': ['css']
      },
    },
    static: path.join(__dirname, "build"),
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ]
};
