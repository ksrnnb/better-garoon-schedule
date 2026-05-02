import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    ...prettierRecommended,
    rules: {
      ...prettierRecommended.rules,
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          printWidth: 80,
          trailingComma: 'all',
          tabWidth: 2,
          arrowParens: 'avoid',
        },
      ],
    },
  },
];
