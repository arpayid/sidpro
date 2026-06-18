import baseConfig from '@sidpro/config/eslint';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
