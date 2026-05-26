const { defineConfig, globalIgnores } = require('eslint/config');

const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const storybookPlugin = require('eslint-plugin-storybook');

module.exports = defineConfig([
    {
        files: ['src/**/*.{ts,tsx,js,jsx}'],

        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },

        plugins: {
            '@typescript-eslint': typescriptEslint,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            storybook: storybookPlugin,
        },

        settings: {
            react: {
                version: 'detect',
            },
        },

        rules: {
            // Best Practices
            'no-use-before-define': 'error',
            'no-redeclare': 'error',
            'no-else-return': 'error',
            'eqeqeq': 'error',

            // Stylistic Issues
            'indent': ['error', 4, { SwitchCase: 1 }],

            // ES6 Rules
            'arrow-parens': ['error', 'as-needed'],
            'prefer-const': 'error',
            'no-var': 'error',

            // React Rules (temporarily disabled due to plugin/runtime mismatches)
            'react/jsx-uses-vars': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-indent': ['error', 4],
            'react/jsx-indent-props': ['error', 4],
            'react/self-closing-comp': 'error',

            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'react-hooks/exhaustive-deps': 'error',
        },
    },
        globalIgnores(['**/lib', '**/.eslintrc.js', '**/*.d.ts', '**/dist/**', '**/build/**', '.storybook/**']),
        // Use full parser services only for our source files (these are in tsconfig)
        {
            files: ["src/**/*.ts", "src/**/*.tsx"],
            languageOptions: {
                parser: tsParser,
                parserOptions: {
                    project: ["./tsconfig.json"],
                    tsconfigRootDir: __dirname,
                },
            },
        },
        // For Storybook and generated/dist files that are outside tsconfig, do not provide `project`.
        {
            files: [".storybook/**", ".storybook/*", "**/dist/**", "**/build/**"],
            languageOptions: {
                parser: tsParser,
            },
        },
]);

