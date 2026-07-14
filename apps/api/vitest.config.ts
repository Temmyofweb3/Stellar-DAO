import { defineConfig } from 'vitest/config';

/**
 * Vite/Vitest needs a hint to bundle the dual ESM/CJS packages we depend on
 * rather than letting Node's loader try — without this, the test runner
 * errors with:
 *   Failed to load url @stellar/stellar-sdk in apps/api/src/server.ts
 *
 * The `server.deps.inline` regex forces Vite to transform these packages
 * at runtime. We cover:
 *
 *   - @stellar/stellar-sdk : the v12 SDK ships a dual ESM/CJS surface that
 *     Vite's optimizer trips on under the workspace's "Bundler" module
 *     resolution. Inlining tells Vite to walk the source itself.
 *   - @noble/curves + @noble/hashes : subpath imports (`/secp256k1`, `/sha256`)
 *     are not in the 1.x exports map; the inline transform picks them up
 *     directly from disk.
 */
export default defineConfig({
  test: {
    environment: 'node',
    server: {
      deps: {
        inline: [
          /@stellar\/stellar-sdk/,
          /@stellar\/stellar-base/,
          /@noble\/curves/,
          /@noble\/hashes/,
        ],
      },
    },
  },
});
