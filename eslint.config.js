import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      eqeqeq: 'error',
      curly: 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: true }],
      complexity: ['error', 12],
      'max-depth': ['error', 3],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['src/shared/**/*.ts', 'src/server/**/*.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: restrict([
      { group: ['**/client/**', '**/server/**'], message: 'shared must stay isomorphic.' },
      {
        group: ['react', 'react-dom', 'react-dom/*', 'express', 'node:*'],
        message: 'shared must stay pure.',
      },
    ]),
  },
  {
    files: ['src/client/**/*.{ts,tsx}'],
    rules: restrict([{ group: ['**/server/**'], message: 'client must not import server code.' }]),
  },
  {
    files: ['src/server/**/*.ts'],
    rules: restrict([{ group: ['**/client/**'], message: 'server must not import client code.' }]),
  },
  {
    files: ['src/client/**/*.{ts,tsx}', 'tests/components/**/*.tsx'],
    languageOptions: { globals: globals.browser },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off', // tests assert on known fixtures
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      // supertest response bodies are untyped JSON; each test asserts their shape explicitly
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
