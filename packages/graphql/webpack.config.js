const path = require("path");
const webpack = require('webpack');
module.exports = {
  entry: "./src/components/index.tsx",
  target: "web",
  mode: "production",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "Graphql.js",
    library: 'Graphql',
  },
  resolve: {
    mainFields: ['browser', 'main', 'module'],
    extensions: [".mjs", ".js", ".json", ".ts", ".tsx",],
  },
  module: {
    rules: [
      {
        test: /\.ts$|tsx/,
        loader: "ts-loader",
      },
      {
        test: /\.m?js$/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false
        },
      },
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      // {
      //   test: /\.flow$/,
      //   loader: 'ignore-loader'
      // }
    ],
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
};
