import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['eslint.config.js'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      eqeqeq: 'error',
      'no-undef': 'error',
      'no-console': 'warn',
    },
  },
];
