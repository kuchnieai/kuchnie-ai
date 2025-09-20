// Custom ESLint flat config for Kuchnie AI
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

const combinedRules = {
  ...tsPlugin.configs.recommended?.rules,
  ...reactPlugin.configs.recommended?.rules,
  ...jsxA11yPlugin.configs.recommended?.rules,
  ...reactHooksPlugin.configs.recommended?.rules,
  ...nextPlugin.configs.recommended?.rules,
  '@typescript-eslint/no-explicit-any': 'off',
  '@next/next/no-img-element': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  'react/react-in-jsx-scope': 'off',
  'react/jsx-uses-react': 'off',
  'react/no-unknown-property': 'off',
  'jsx-a11y/click-events-have-key-events': 'off',
  'jsx-a11y/no-noninteractive-element-interactions': 'off',
  'jsx-a11y/no-static-element-interactions': 'off',
};

export default [
  {
    ignores: ['.next/**/*', 'node_modules/**/*'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@next/next': nextPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: combinedRules,
  },
];
