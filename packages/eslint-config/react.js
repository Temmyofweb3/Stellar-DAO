import tseslint from 'typescript-eslint';

import base from './index.js';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

// ESLint v9 strictly validates plugin objects. Strip the `__esModule`
// interop marker that CJS plugins carry when imported in an ESM context
// (see packages/eslint-config/index.js for the full explanation).
const { __esModule: _ignoredReactInteropMark, ...cleanReactPlugin } =
  reactPlugin;
const { __esModule: _ignoredHooksInteropMark, ...cleanHooksPlugin } =
  hooksPlugin;
void _ignoredReactInteropMark;
void _ignoredHooksInteropMark;

export default tseslint.config(
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: cleanReactPlugin,
      'react-hooks': cleanHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // `.rules` is a plain object map of rule name -> severity/options;
      // no interop markers live inside it, so reading from the original
      // (unstripped) plugin export is safe here.
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
);
