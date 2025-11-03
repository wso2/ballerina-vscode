//@ts-check

'use strict';

const path = require('path');
const MergeIntoSingleFile = require('webpack-merge-and-include-globally');
const dotenv = require('dotenv');
const webpack = require('webpack');
const { createEnvDefinePlugin } = require('../../../common/scripts/env-webpack-helper');

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed;
console.log("Fetching values for environment variables...");
const { envKeys, missingVars } = createEnvDefinePlugin(env);
if (missingVars.length > 0) {
  console.warn(
    '\n⚠️  Environment Variable Configuration Warning:\n' +
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
    `Please provide values in either .env file or runtime environment.\n`
  );
}

/** @type {import('webpack').Configuration} */
module.exports = {
  watch: false,
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: !process.env.CI ? "source-map" : undefined,
  externals: {
    keytar: "commonjs keytar",
    vscode: 'commonjs vscode',
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              logLevel: "info"
            }
          }
        ]
      }
    ]
  },
  stats: 'normal',
  plugins: [
    new webpack.DefinePlugin(envKeys),
    new MergeIntoSingleFile({
      files: {
        [path.join('..', 'resources', 'jslibs', 'webviewCommons.js')]: [
          path.resolve('resources', 'utils', 'undo-redo.js'),
          path.resolve('node_modules', 'pako', 'dist', 'pako.min.js'),
        ],
      },
      transform: {
        'webviewCommons.js': code => require("uglify-js").minify(code).code
      }
    })
  ]
};
