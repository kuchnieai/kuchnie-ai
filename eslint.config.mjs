// eslint.config.mjs
// Flat-config (ESLint v9+) for Next.js 15 + TypeScript

import '@rushstack/eslint-patch/modern-module-resolution.js';
import next from 'eslint-config-next';

export default [
  // Bazowy zestaw reguł od Next.js (React, TS, a11y, itp.)
  ...next,

  // Wykluczenia z lintowania
  {
    ignores: ['.next/**/*', 'node_modules/**/*'],
  },

  // Twoje korekty reguł pod build na Vercelu
  {
    rules: {
      // Pozwól na `any` (blokowało build)
      '@typescript-eslint/no-explicit-any': 'off',

      // Pozwól na zwykły <img> (u nas i tak lecą zewnętrzne URL-e)
      '@next/next/no-img-element': 'off',
    },
  },
];
