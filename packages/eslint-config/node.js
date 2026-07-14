import tseslint from 'typescript-eslint';

import base from './index.js';

// The node preset just inherits the base + adds Node.js globals + turns
// off `no-console`. No third-party plugins are imported here, so there
// is no `__esModule` interop strip needed.
export default tseslint.config(
  ...base,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-process-exit': 'warn',
    },
  },
);
