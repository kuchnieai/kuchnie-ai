import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const nextRules = {
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs['core-web-vitals'].rules,
  '@next/next/no-img-element': 'off',
};

const sharedPlugins = {
  '@typescript-eslint': tseslint.plugin,
  import: importPlugin,
  'react-hooks': reactHooksPlugin,
  'jsx-a11y': jsxA11yPlugin,
  '@next/next': nextPlugin,
};

const sharedRules = {
  ...reactHooksPlugin.configs.recommended.rules,
  ...nextRules,
  'import/no-anonymous-default-export': 'warn',
  'react/no-unknown-property': 'off',
  'react/react-in-jsx-scope': 'off',
  'react/prop-types': 'off',
  'jsx-a11y/alt-text': [
    'warn',
    {
      elements: ['img'],
      img: ['Image'],
    },
  ],
  'jsx-a11y/aria-props': 'warn',
  'jsx-a11y/aria-proptypes': 'warn',
  'jsx-a11y/aria-unsupported-elements': 'warn',
  'jsx-a11y/role-has-required-aria-props': 'warn',
  'jsx-a11y/role-supports-aria-props': 'warn',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
};

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: sharedPlugins,
    rules: sharedRules,
  },
);
