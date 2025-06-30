const path = require('path');
const webpack = require('webpack');

module.exports = {
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials"
  ],
  "core": {
    "builder": "webpack5"
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      compilerOptions: {
        "allowSyntheticDefaultImports": true,
        "resolveJsonModule": true,
        "esModuleInterop": true,
      },
    }
  },
  webpackFinal: async (config, { configType }) => {
    config.module.rules.push({
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'sass-loader']
    });
    config.plugins = [
      ...config.plugins,
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
    ];
    config.resolve = {
      ...config.resolve,
      modules: [path.resolve(__dirname, '../src'), 'node_modules'],
      alias: {
        handlebars: 'handlebars/dist/handlebars.min.js',
        // vscode: require.resolve('monaco-languageclient/lib/vscode-compatibility'),
        "crypto": false,
        "net": false,
        "os": false,
        "path": false,
        "fs": false,
        "child_process": false,
      },
      fallback: {
        buffer: require.resolve('buffer/'),
      },
    }
    return config;
  }
}
