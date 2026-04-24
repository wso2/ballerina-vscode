module.exports = {
  root: true,
  env: { browser: true},
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['lib', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Disable runtime-problematic react rules until plugin/runtime versions are aligned
    'react/jsx-uses-vars': 'off',
    'react/jsx-uses-react': 'off',
  },
}
