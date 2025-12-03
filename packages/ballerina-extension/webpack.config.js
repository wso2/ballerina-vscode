//@ts-check

'use strict';

const path = require('path');
const fs = require('fs');
const { minify } = require('uglify-js');
const dotenv = require('dotenv');
const webpack = require('webpack');
const { createEnvDefinePlugin } = require('../../../common/scripts/env-webpack-helper');

/**
 * Concatenate and minify a list of source files into a single output file.
 * @param {{ sources: string[]; outputRelativePath: string }} options
 * @returns {{ apply(compiler: import('webpack').Compiler): void }}
 */
function concatenateAndMinify(options) {
  return {
    apply(compiler) {
      compiler.hooks.afterEmit.tapPromise('ConcatenateAndMinifyPlugin', async (compilation) => {
        try {
          const concatenated = options.sources
            .map(file => fs.readFileSync(file, 'utf8'))
            .join('\n;\n');
          const result = minify(concatenated, { toplevel: false });
          if (result.error) throw result.error;
          const outBase = (compiler.options.output && compiler.options.output.path) ? compiler.options.output.path : path.resolve(__dirname, 'dist');
          const outPath = path.resolve(outBase, options.outputRelativePath);
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, result.code, 'utf8');
          console.log(`Created concatenated webview commons: ${outPath}`);
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          compilation.errors.push(e);
          console.error('Failed to build webviewCommons.js:', e);
        }
      });
    }
  };
}

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed || {}; // ensure object for //@ts-check
console.log("Fetching values for environment variables...");
const cenv = /** @type {any} */ (createEnvDefinePlugin(env));
const envKeys = cenv.envKeys || {};
const missingVars = Array.isArray(cenv.missingVars) ? cenv.missingVars : [];
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
    // Custom concatenation + minification plugin (replacement for deprecated dependency)
    concatenateAndMinify({
      sources: [
        path.resolve(__dirname, 'resources', 'utils', 'undo-redo.js'),
        path.resolve(__dirname, 'node_modules', 'pako', 'dist', 'pako.min.js'),
      ],
      outputRelativePath: path.join('..', 'resources', 'jslibs', 'webviewCommons.js')
    })
  ]
};
