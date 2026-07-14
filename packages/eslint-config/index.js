import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

// ESLint v9 flat config strictly validates plugin objects — any unknown
// top-level property throws `Unexpected top-level property "X"`. CJS plugins
// imported in an ESM context come wrapped with `{ __esModule: true, ... }`
// from the TS/Babel interop shim, which ESLint v9 rejects. Strip the marker
// before handing the plugin to ESLint.
const { __esModule: _ignoredImportInteropMark, ...cleanImportPlugin } =
  importPlugin;
void _ignoredImportInteropMark;

// `typescript-eslint.config()` is the recommended helper in v8 — it produces
// a flat-config array and strips any interop markers from the @typescript-
// eslint configs internally.
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: cleanImportPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  prettier,
);
