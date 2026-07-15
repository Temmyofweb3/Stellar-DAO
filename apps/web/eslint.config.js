// apps/web-specific ESLint v9 flat config.
//
// `next lint` walks up from `apps/web/` looking for an eslint config.
// This file shadows the root `eslint.config.js` so the web app uses the
// react preset (for JSX) rather than the node preset, and so the `.next/`
// build output is explicitly ignored for the web build.
//
// The shared react preset in `packages/eslint-config/react.js` is now a
// native flat-config array (post the typescript-eslint umbrella switch),
// so we import it directly without `FlatCompat`.

import reactConfig from '../../packages/eslint-config/react.js';

export default [
  {
    // `next-env.d.ts` is a Next.js-generated shim (regenerated on every
    // `next dev` / `next build`). typescript-eslint's strict
    // `triple-slash-reference` rule treats it as `error`; the canonical
    // Next.js flat-config guidance is to ignore it.
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'dist/**', 'next-env.d.ts'],
  },
  ...reactConfig,
];
