//@ts-check

'use strict';

const path = require('path');
const MergeIntoSingleFile = require('webpack-merge-and-include-globally');
const dotenv = require('dotenv');
const webpack = require('webpack');

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed;

function shouldSkipEnvVar(key) {
  const pathVariables = ['PATH', 'Path'];
  return pathVariables.includes(key);
}

const filteredProcessEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key, value]) => !shouldSkipEnvVar(key))
);

const mergedEnv = { ...env, ...filteredProcessEnv };

const envKeys = Object.fromEntries(
  Object.entries(mergedEnv)
    .filter(([key, value]) => key && value !== undefined && value !== '')
    .map(([key, value]) => [
      `process.env.${key}`,
      JSON.stringify(value),
    ])
);

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
  devtool: 'source-map',
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
