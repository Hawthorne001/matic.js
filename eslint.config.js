import { defineConfig } from 'eslint/config';

import { recommended, typescript } from '@polygonlabs/apps-team-lint';

// Extract the @typescript-eslint plugin from the typescript() configs so we can
// reference it in our override without adding a separate direct dependency.
const tsConfigs = typescript();
const tsPluginConfig = tsConfigs.find((c) => c.plugins?.['@typescript-eslint']);
const tsPlugin = tsPluginConfig?.plugins?.['@typescript-eslint'];

export default defineConfig([
  ...recommended({ globals: 'node' }),
  ...tsConfigs,
  {
    // Standard convention: parameters prefixed with _ are intentionally unused.
    // Applied globally so abstract stub implementations (EmptyBigNumber, etc.)
    // don't require inline disables.
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    ignores: [
      '**/dist/**',
      // webpack banner helper — uses `package` as a var name (reserved word in strict mode)
      'packages/maticjs/build_helper/**',
      // license.js uses `const package = require(...)` which is unparseable
      'packages/maticjs/license.js',
      // legacy jest/karma test suite — to be replaced with vitest in a separate PR
      'packages/maticjs/test/**',
      // standalone consumer-facing reference scripts, not part of the workspace
      'examples/**',
      // manual developer scratch scripts — not automated, not part of the workspace
      'manual/**'
    ]
  },
  {
    // http_request.ts uses a conditional runtime require() to load node-fetch only
    // in the Node.js webpack bundle (BUILD_ENV === 'node'). A static import would
    // cause the browser bundle to reference node-fetch at parse time. This is a
    // webpack-specific build pattern that cannot be replaced with a static import
    // without splitting the file into separate browser/node entry points.
    files: ['packages/maticjs/src/utils/http_request.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    // src/index.ts re-exports everything and also has `export default defaultExport`
    // for backwards compatibility with consumers using default import syntax.
    // Removing it is a semver-major breaking API change, deferred to a future release.
    files: ['packages/maticjs/src/index.ts'],
    rules: {
      'import-x/no-default-export': 'off'
    }
  }
]);
