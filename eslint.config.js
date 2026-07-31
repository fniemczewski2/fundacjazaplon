import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      'react/react-in-jsx-scope': 'off', // niepotrzebne z automatycznym JSX runtime
      'react/prop-types': 'off', // typy pilnuje TypeScript, nie prop-types

      // Reguły, o które prosiłeś wprost w audycie:
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/no-unstable-nested-components': 'error',
      'react/jsx-key': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-alert': 'error',
      'eqeqeq': 'error',
    },
  },

  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ['**/*.jsx'],
    rules: {
      // Nowe pliki JS w projekcie TS-owym nie są mile widziane — patrz audyt 2.6.
      'no-restricted-syntax': ['warn'],
    },
  },
);
