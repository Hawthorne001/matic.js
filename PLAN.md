# Monorepo Migration Plan

This document tracks the planned work to convert `0xPolygon/matic.js` into a
pnpm monorepo, add a viem provider plugin, and consolidate the existing web3
and ethers provider plugins from their standalone repos.

---

## Overview

| Phase | PR   | Description                                                                  |
| ----- | ---- | ---------------------------------------------------------------------------- |
| 1a    | PR 1 | Monorepo structure — move core to `packages/maticjs/`, add workspace tooling |
| 1b    | PR 2 | Replace tslint with ESLint; update CI workflows                              |
| 2     | PR 3 | Add `@maticnetwork/maticjs-viem` in `packages/viem/`                         |
| 3a    | PR 4 | Migrate `maticjs-web3` into `packages/web3/`, archive external repo          |
| 3b    | PR 5 | Migrate `maticjs-ethers` into `packages/ethers/`, archive external repo      |

Out of scope: `maticjs-plasma` and `maticjs-staking` are domain bridge clients
(they extend `BridgeClient`, not `IPlugin`) and remain as independent repos.

---

## Phase 1a — PR 1: Monorepo structure

Structural reorganisation only. No source code changes. `pnpm publish` of
`@maticnetwork/maticjs` must produce an identical artefact before and after.

### New root files

- [ ] `pnpm-workspace.yaml`
  - `packages: ['packages/*']`
  - Full supply chain block copied from `apps-team-ts-template`:
    `blockExoticSubdeps`, `minimumReleaseAge: 1440`,
    `minimumReleaseAgeExclude` (`@polygonlabs/*`, `@maticnetwork/*`,
    `@agglayer/*`, `@0xsequence/*`, `@0xtrails/*`), `trustPolicy: no-downgrade`

- [ ] `.npmrc`
  - `link-workspace-packages=false`
  - `auto-install-peers=true`

- [ ] `package.json` (root — private, devDeps only)
  - `"private": true`
  - `"packageManager": "pnpm@10.x"` (match current pnpm version)
  - devDependencies: `@changesets/cli`, `@polygonlabs/apps-team-lint`,
    `@tsconfig/node24`, `@tsconfig/node-ts`, `eslint`, `husky`,
    `lint-staged`, `markdownlint-cli2`, `prettier`, `typescript@^5.5`
  - scripts: `build` (`pnpm -r run build`), `lint` / `lint:ts` (`eslint .`),
    `format` (`prettier --write .`), `typecheck` (`tsc --noEmit`),
    `ci:publish` (`pnpm exec changeset publish`)
  - No `"workspaces"` field (declared in `pnpm-workspace.yaml`)

- [ ] `tsconfig.json` (root)
  - `"extends": ["@tsconfig/node24", "@tsconfig/node-ts"]`
  - `"compilerOptions": { "noEmit": true }`
  - `"references": [{ "path": "packages/maticjs" }]`
  - Note: `packages/maticjs` does NOT use `erasableSyntaxOnly` (see below)

- [ ] `.changeset/config.json`

  ```json
  {
    "changelog": "@changesets/cli/changelog",
    "commit": false,
    "baseBranch": "master",
    "updateInternalDependencies": "patch",
    "bumpVersionsWithWorkspaceProtocolOnly": false,
    "privatePackages": { "version": true, "tag": true }
  }
  ```

- [ ] `.nvmrc` — update from `v11.1.0` to Node 24 (e.g. `24`)

- [ ] `.prettierrc.json` — verbatim copy from `apps-team-ts-template`

- [ ] `.markdownlint-cli2.jsonc` — verbatim copy from `apps-team-ts-template`

- [ ] `.lintstagedrc.js` — verbatim copy from `apps-team-ts-template`

- [ ] `.husky/pre-commit` — verbatim copy from template (runs lint-staged only;
      removes the current "run full webpack build on every commit")

- [ ] `.husky/commit-msg` — verbatim copy from template (conventional commits)

- [ ] `.husky/pre-push` — verbatim copy from template (changeset status check
      against `master`; skips on `changeset-release/*` branches and `master` itself)

- [ ] `MIGRATION.md` — create at repo root (empty scaffold; populated before
      each npm release with consumer-facing migration notes)

- [ ] `.github/CODEOWNERS` — define team as required reviewers

### Move core package to `packages/maticjs/`

- [ ] Move `src/` → `packages/maticjs/src/`
- [ ] Move `test/` → `packages/maticjs/test/`
- [ ] Move `webpack.config.js` → `packages/maticjs/webpack.config.js`
- [ ] Move `license.js` → `packages/maticjs/license.js`
- [ ] Move `build_helper/` → `packages/maticjs/build_helper/`
- [ ] Move `artifacts/` → `packages/maticjs/artifacts/`
- [ ] Move `examples/` → `packages/maticjs/examples/`
- [ ] Delete root `src/`, `test/`, `webpack.config.js`, `license.js`,
      `build_helper/`, `artifacts/`, `examples/` after move

### `packages/maticjs/package.json`

Based on current root `package.json`, with these changes:

- [ ] `"repository"`:

  ```json
  {
    "type": "git",
    "url": "https://github.com/0xPolygon/matic.js.git",
    "directory": "packages/maticjs"
  }
  ```

- [ ] Add `"publishConfig": { "access": "public" }`
- [ ] Add `"MIGRATION.md"` to `"files"` array
- [ ] Remove `"husky"` hooks block (hooks live at monorepo root)
- [ ] Replace all `npm run` references in scripts with `pnpm run`
- [ ] Add `"typecheck": "tsc --noEmit"` script
- [ ] Keep `main`, `browser`, `react-native`, `types` entry points unchanged
- [ ] Keep all existing `dependencies` unchanged
- [ ] devDependencies: keep webpack, ts-loader, yargs, rimraf, copy-webpack-plugin;
      remove tslint (replaced by root ESLint); remove husky / lint-staged (now root)

### `packages/maticjs/tsconfig.json`

- [ ] Custom config — does NOT extend `@tsconfig/node-ts` because the existing
      source uses TypeScript `enum` which is incompatible with `erasableSyntaxOnly`

  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "noEmit": false,
      "lib": ["es2015", "dom"],
      "target": "ES2015",
      "moduleResolution": "node",
      "declaration": true,
      "esModuleInterop": true,
      "resolveJsonModule": true,
      "outDir": "dist/ts",
      "rootDir": "src"
    },
    "include": ["src/**/*"]
  }
  ```

  Note: target upgraded ES5 → ES2015; no browser ships UMD targeting ES5 in 2025.
  TypeScript upgraded to ^5.9.3 — builds cleanly once npm node_modules is removed;
  the apparent TS5 `Buffer`/`Uint8Array` breakage was a mixed npm/pnpm resolution
  artefact, not a genuine TypeScript version issue.

### `packages/maticjs/MIGRATION.md`

- [ ] Create `packages/maticjs/MIGRATION.md` (scaffold; content added per release)

### Root `tslint.json` / `.eslintignore`

- [ ] Delete root `tslint.json` (replaced by `eslint.config.js` in PR 2)
- [ ] Delete root `.eslintignore` (replaced by `ignores` in `eslint.config.js`)

### Root `package.json` cleanup

- [ ] Remove `scripts` that reference the old webpack build
- [ ] Remove `devDependencies` that move to `packages/maticjs/` (webpack etc.)
- [ ] Remove `husky` hooks block
- [ ] Remove `browserslist`, `engines` (belong on the published package)

---

## Phase 1b — PR 2: ESLint and workflows

### ESLint

- [ ] `eslint.config.js` (root)

  ```js
  import { defineConfig } from 'eslint/config';
  import { recommended, typescript } from '@polygonlabs/apps-team-lint';
  export default defineConfig([
    ...recommended({ globals: 'node' }),
    ...typescript(),
    { ignores: ['**/dist/**', 'packages/maticjs/build_helper/**'] }
  ]);
  ```

- [ ] Fix or suppress lint errors surfaced in `packages/maticjs/src/`
      (use inline `// eslint-disable-next-line` with TODO comments for
      pre-existing issues; do not silently disable entire files)

### GitHub Actions — public repo workflow pattern

`matic.js` is a public repo in `0xPolygon`. Neither reusable workflows nor
composite actions from the private `0xPolygon/apps-team-workflows` repo can
be referenced. Every workflow and action must be a local copy with zero
references to `apps-team-workflows` remaining anywhere.

Pattern: a thin `*-trigger.yml` handles the event trigger and calls a local
copy of the reusable workflow at `./.github/workflows/<name>.yml`. Composite
actions are copied to `.github/actions/<name>/`.

**Note on `npm-release.yml`:** the local copy requires three `main` →
`master` substitutions where branch names are hardcoded. All other content
is byte-for-byte identical.

- [ ] Delete `.github/workflows/ci.yml` (old npm-based workflow)
- [ ] Delete `.github/workflows/github_doc_deploy.yml` (fires on `docs` branch,
      last touched July 2022; GitHub Pages not configured on the repo — confirmed dead)

#### Composite actions (local copies under `.github/actions/`)

- [ ] `.github/actions/ci/action.yml`
      — verbatim copy from `apps-team-workflows/.github/actions/ci/action.yml`

- [ ] `.github/actions/upsert-changeset-comment/action.yml`
      — verbatim copy from
      `apps-team-workflows/.github/actions/upsert-changeset-comment/action.yml`

- [ ] `.github/actions/upsert-changeset-comment/dist/index.js`
      — verbatim copy of the compiled bundle from
      `apps-team-workflows/.github/actions/upsert-changeset-comment/dist/index.js`

- [ ] `.github/actions/upsert-changeset-comment/dist/package.json`
      — verbatim copy from the same location

#### Reusable workflows (local copies under `.github/workflows/`)

- [ ] `.github/workflows/ci-trigger.yml`
      — same `on:` / `permissions:` as template, but:
  - `branches: [master]` (not `main`)
  - step `uses: ./.github/actions/ci` (local copy)

- [ ] `.github/workflows/changeset-check.yml`
      — copy from `apps-team-workflows/.github/workflows/changeset-check.yml`
      with one substitution:
  - `uses: 0xPolygon/apps-team-workflows/.github/actions/upsert-changeset-comment@main`
    → `uses: ./.github/actions/upsert-changeset-comment`

- [ ] `.github/workflows/changeset-check-trigger.yml`
      — same as template but:
  - `branches: [master]`
  - `uses: ./.github/workflows/changeset-check.yml`

- [ ] `.github/workflows/npm-release.yml`
      — copy from `apps-team-workflows/.github/workflows/npm-release.yml`
      with three substitutions (hardcoded branch names):
  - `git/refs/heads/main` → `git/refs/heads/master`
  - `git fetch origin main --tags` → `git fetch origin master --tags`
  - `git merge --ff-only origin/main` → `git merge --ff-only origin/master`

- [ ] `.github/workflows/npm-release-trigger.yml`
      — same as template but:
  - `branches: [master]`
  - `uses: ./.github/workflows/npm-release.yml`

- [ ] `.github/workflows/claude-code-review.yml`
      — verbatim copy from
      `apps-team-workflows/.github/workflows/claude-code-review.yml`

- [ ] `.github/workflows/claude-code-review-trigger.yml`
      — same as template but:
  - `uses: ./.github/workflows/claude-code-review.yml`

- [ ] `.github/workflows/claude.yml`
      — verbatim copy from `apps-team-workflows/.github/workflows/claude.yml`

- [ ] `.github/workflows/claude-trigger.yml`
      — same as template but:
  - `uses: ./.github/workflows/claude.yml`

### CI Node matrix

- [ ] `ci-trigger.yml`: Node 24 only (drop 16/18)

---

## Phase 2 — PR 3: `@maticnetwork/maticjs-viem`

New package. Uses tsup. Requires Node 24 / `@tsconfig/node-ts`. No enums.

### `packages/viem/` structure

- [ ] `packages/viem/src/index.ts` — re-exports
- [ ] `packages/viem/src/types.ts` — `ViemClientConfig`
- [ ] `packages/viem/src/plugin.ts` — `ViemPlugin implements IPlugin`
- [ ] `packages/viem/src/web3-client.ts` — `ViemWeb3Client extends BaseWeb3Client`
- [ ] `packages/viem/src/contract.ts` — `ViemContract extends BaseContract`
- [ ] `packages/viem/src/contract-method.ts` — `ViemContractMethod extends BaseContractMethod`
- [ ] `packages/viem/src/big-number.ts` — `ViemBigNumber extends BaseBigNumber`
- [ ] `packages/viem/src/abi-utils.ts` — converts bare Solidity type strings
      (e.g. `"uint256"`) to viem `AbiParameter[]` objects for
      `encodeAbiParameters` / `decodeAbiParameters`
- [ ] `packages/viem/tests/web3-client.test.ts` — unit tests with mocked clients
- [ ] `packages/viem/MIGRATION.md`

### `packages/viem/package.json`

- [ ] `"name": "@maticnetwork/maticjs-viem"`
- [ ] `"repository"`:

  ```json
  {
    "type": "git",
    "url": "https://github.com/0xPolygon/matic.js.git",
    "directory": "packages/viem"
  }
  ```

- [ ] `"publishConfig": { "access": "public" }`
- [ ] `"files": ["dist", "MIGRATION.md"]`
- [ ] `"exports"`:

  ```json
  {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
  ```

- [ ] `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`
- [ ] `"peerDependencies"`:
  - `"@maticnetwork/maticjs": "workspace:*"`
  - `"viem": "^2.0.0"`
- [ ] devDependencies: `tsup`, `vitest`, `typescript`, `@tsconfig/node24`,
      `@tsconfig/node-ts`, `viem`, `@maticnetwork/maticjs`
- [ ] scripts: `build` (`tsup`), `test` (`vitest run`),
      `typecheck` (`tsc --noEmit`)

### `packages/viem/tsup.config.ts`

- [ ] `entry: ['src/index.ts']`
- [ ] `format: ['cjs', 'esm']`
- [ ] `dts: true`
- [ ] `clean: true`
- [ ] `external: ['@maticnetwork/maticjs', 'viem']`
- [ ] `target: 'es2020'`

### `packages/viem/tsconfig.json`

- [ ] `"extends": ["../../tsconfig.json", "@tsconfig/node-ts"]`
      (inherits root; adds `erasableSyntaxOnly`, `verbatimModuleSyntax`)
- [ ] `"include": ["src/**/*.ts", "tests/**/*.ts"]`

### `packages/viem/tsconfig.build.json`

- [ ] `"extends": "./tsconfig.json"`
- [ ] `"compilerOptions": { "noEmit": false, "outDir": "dist", "rootDir": "src" }`
- [ ] `"include": ["src/**/*.ts"]`

### `packages/viem/vitest.config.ts`

- [ ] Standard config; no global timeout overrides

### Root `tsconfig.json` update

- [ ] Add `{ "path": "packages/viem" }` to `references`

### Implementation notes

- `ViemClientConfig`: `{ publicClient: PublicClient; walletClient?: WalletClient }`
- `ViemPlugin.setup()`: sets `matic.utils.Web3Client = ViemWeb3Client`,
  `matic.utils.BN = ViemBigNumber`, `matic.utils.isBN = (v) => typeof v === 'bigint'`
- `write()` returns `ITransactionWriteResult` synchronously — transaction is
  only sent when `getTransactionHash()` is first called (lazy evaluation)
- `encodeParameters` / `decodeParameters`: use `abi-utils.ts` converter because
  viem's `encodeAbiParameters` takes typed `AbiParameter[]`, not Solidity strings
- `etheriumSha3`: viem's `keccak256` with hex-encoded concatenation of args
- `ViemBigNumber` wraps native `BigInt`; arithmetic via BigInt operators

### Changeset

- [ ] `pnpm exec changeset add` — minor bump for new package `@maticnetwork/maticjs-viem`

---

## Phase 3a — PR 4: Migrate `maticjs-web3`

Source copied from `0xPolygon/maticjs-web3`. Replaces webpack 4 with tsup.

### `packages/web3/` structure

- [ ] Copy `src/` from `0xPolygon/maticjs-web3`
- [ ] `packages/web3/MIGRATION.md`

### `packages/web3/package.json`

- [ ] `"name": "@maticnetwork/maticjs-web3"` (unchanged npm name)
- [ ] `"repository"`:

  ```json
  {
    "type": "git",
    "url": "https://github.com/0xPolygon/matic.js.git",
    "directory": "packages/web3"
  }
  ```

- [ ] `"publishConfig": { "access": "public" }`
- [ ] `"files": ["dist", "MIGRATION.md"]`
- [ ] `exports` field (same pattern as `packages/viem`)
- [ ] peerDependencies: `@maticnetwork/maticjs: "workspace:*"`, `web3: "^1.8.0"`
      (web3 v2 upgrade is deferred — migrate as-is to minimise risk)
- [ ] devDependencies: `tsup`, `vitest`, `typescript`, `@tsconfig/node24`,
      `@tsconfig/node-ts`, `web3`, `@maticnetwork/maticjs`

### Build / test

- [ ] `packages/web3/tsup.config.ts` — same shape as `packages/viem`
- [ ] `packages/web3/tsconfig.json` — extends root + `@tsconfig/node-ts`
- [ ] `packages/web3/tsconfig.build.json`
- [ ] `packages/web3/vitest.config.ts`
- [ ] Replace karma/mocha tests with vitest unit tests

### Root updates

- [ ] Add `{ "path": "packages/web3" }` to root `tsconfig.json` references

### Post-merge

- [ ] Cut a release (changeset) from monorepo to publish new version
- [ ] Update `0xPolygon/maticjs-web3` README: "This package has moved to
      [0xPolygon/matic.js](https://github.com/0xPolygon/matic.js). Final
      standalone release: vX.Y.Z."
- [ ] Archive `0xPolygon/maticjs-web3` on GitHub

### Changeset

- [ ] `pnpm exec changeset add` — patch bump for `@maticnetwork/maticjs-web3`
      (no functional change; new build output shape)

---

## Phase 3b — PR 5: Migrate `maticjs-ethers`

Same process as PR 4.

### `packages/ethers/` structure

- [ ] Copy `src/` from `0xPolygon/maticjs-ethers`
- [ ] `packages/ethers/MIGRATION.md`

### `packages/ethers/package.json`

- [ ] `"name": "@maticnetwork/maticjs-ethers"` (unchanged npm name)
- [ ] `"repository"`:

  ```json
  {
    "type": "git",
    "url": "https://github.com/0xPolygon/matic.js.git",
    "directory": "packages/ethers"
  }
  ```

- [ ] `"publishConfig": { "access": "public" }`
- [ ] `"files": ["dist", "MIGRATION.md"]`
- [ ] `exports` field
- [ ] peerDependencies: `@maticnetwork/maticjs: "workspace:*"`, `ethers: "^5.5.1"`
      (ethers v6 upgrade deferred — migrate as-is)
- [ ] devDependencies: `tsup`, `vitest`, `typescript`, `@tsconfig/node24`,
      `@tsconfig/node-ts`, `ethers`, `@maticnetwork/maticjs`

### Build / test

- [ ] `packages/ethers/tsup.config.ts`
- [ ] `packages/ethers/tsconfig.json`
- [ ] `packages/ethers/tsconfig.build.json`
- [ ] `packages/ethers/vitest.config.ts`
- [ ] Replace karma/mocha tests with vitest unit tests

### Root updates

- [ ] Add `{ "path": "packages/ethers" }` to root `tsconfig.json` references

### Post-merge

- [ ] Cut release, update `0xPolygon/maticjs-ethers` README, archive repo

### Changeset

- [ ] `pnpm exec changeset add` — patch bump for `@maticnetwork/maticjs-ethers`

---

## Deferred (not in scope for this migration)

| Item                                                 | Reason                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Migrate `packages/maticjs/test/` to vitest           | Needs live RPC endpoints and wallet keys; tackled separately |
| Migrate webpack → tsup in `packages/maticjs/`        | Working build; low risk to defer                             |
| Remove `export default` from `src/index.ts`          | Breaking public API change; needs semver-major               |
| Convert `enum` to `const` in `packages/maticjs/src/` | Enables `erasableSyntaxOnly`; significant churn; own PR      |
| ethers v6 upgrade                                    | API chasm; own migration guide and PR                        |
| web3 v2 upgrade                                      | Same                                                         |
| `maticjs-plasma`                                     | Extends `BridgeClient`, not `IPlugin`; stays independent     |
| `maticjs-staking`                                    | Same                                                         |
