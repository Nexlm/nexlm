import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat config for the whole workspace: Node for the API, browser + React for the
 * client, and test globals for both suites.
 */
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'server/prisma/migrations/**'],
  },

  js.configs.recommended,

  {
    // Shared rules. These catch real mistakes; style is left to the editor.
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-return-await': 'error',
    },
  },

  {
    files: ['server/**/*.js', 'server/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  {
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },

  {
    files: ['**/*.test.{js,jsx}', 'server/tests/**/*.js', 'client/src/test/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },

  {
    files: ['**/*.config.js', 'client/postcss.config.js', 'client/tailwind.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    // These write to the terminal on purpose.
    files: ['server/prisma/seed.js', 'server/scripts/**', 'server/src/lib/logger.js'],
    rules: { 'no-console': 'off' },
  },
];
