# Monorepo Migration Plan

This document tracks the planned work to convert `0xPolygon/matic.js` into a
pnpm monorepo, add a viem provider plugin, and consolidate the existing web3
and ethers provider plugins from their standalone repos.

---

## Overview

| Phase | PR   | Description                                                                   | Status |
| ----- | ---- | ----------------------------------------------------------------------------- | ------ |
| 1a    | PR 1 | Monorepo structure — move core to `packages/maticjs/`, add workspace tooling | ✅ #463 |
| 1b    | PR 2 | ESLint, commitlint, vitest, GitHub Actions workflows                          | ✅ #463 |
| 2     | PR 3 | Add `@maticnetwork/maticjs-viem` in `packages/viem/`                         | ⬜ next |
| 3a    | PR 4 | Migrate `maticjs-web3` into `packages/web3/`, archive external repo          | ⬜      |
| 3b    | PR 5 | Migrate `maticjs-ethers` into `packages/ethers/`, archive external repo      | ⬜      |

Out of scope: `maticjs-plasma` and `maticjs-staking` are domain bridge clients
(they extend `BridgeClient`, not `IPlugin`) and remain as independent repos.

---

## Phase 1a — PR 1: Monorepo structure ✅

Structural reorganisation only. No source code changes. `pnpm publish` of
`@maticnetwork/maticjs` must produce an identical artefact before and after.

### New root files

- [x] `pnpm-workspace.yaml`
- [x] `.npmrc` — `link-workspace-packages=false`, `auto-install-peers=true`
- [x] `package.json` (root — private, devDeps only, `type: module`)
- [x] `tsconfig.json` (root) — `files: []`, references `packages/maticjs/tsconfig.build.json`
- [x] `.changeset/config.json` — `baseBranch: master`
- [x] `.nvmrc` — Node 24
- [x] `.prettierrc.json`
- [x] `.markdownlint-cli2.jsonc`
- [x] `.lintstagedrc.js`
- [x] `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`
- [x] `MIGRATION.md` (scaffold)
- [x] `.github/CODEOWNERS`

### Move core package to `packages/maticjs/`

- [x] Move `src/`, `webpack.config.js`, `license.js`, `build_helper/` into `packages/maticjs/`
- [x] Move `examples/` to repo root (cleaner for external consumers)
- [x] Move manual dev scripts (`debug.js`, `ether.js`, `config.js`) to `manual/` at repo root
- [x] Delete root copies after move

### `packages/maticjs/package.json`

- [x] `repository` with `directory: packages/maticjs` (trusted publishing)
- [x] `publishConfig.access: public`
- [x] `MIGRATION.md` in `files` array
- [x] Remove `husky` hooks block; replace `npm run` with `pnpm run`
- [x] Add `typecheck` and `test` scripts
- [x] Add `@ethereumjs/common` and `safe-buffer` as explicit deps (pnpm strict isolation
      exposed these were direct imports but only transitive under npm)
- [x] Pin `typescript` to `^5.9.3` (tested clean; earlier apparent TS5 breakage was
      a mixed npm/pnpm resolution artefact)

### `packages/maticjs/tsconfig.json` + `tsconfig.build.json`

- [x] Standalone tsconfig (not extending root) — `module: commonjs`,
      `moduleResolution: node`, `skipLibCheck: true`, `strict: false`
- [x] `tsconfig.build.json` — composite, `rootDir: src`, used by project references
- [x] `tsconfig.json` includes `src/**/*`, `tests/**/*`, `vitest.config.ts`

### Tests

- [x] Delete broken nested test project (`test/package.json`, jest@27, npm link,
      live-RPC dependencies)
- [x] Migrate `specs/index.ts` → `packages/maticjs/tests/map-promise.test.ts` (vitest,
      7 passing unit tests, no network required)
- [x] Add `vitest.config.ts`

### Root `tslint.json` / `.eslintignore` / `package-lock.json`

- [x] Delete root `tslint.json`, `.eslintignore`, `package-lock.json`

---

## Phase 1b — PR 2: ESLint, workflows ✅

### ESLint + commitlint + markdownlint

- [x] `eslint.config.js` — `@polygonlabs/apps-team-lint@2.0.0`, `@tsconfig/node-ts`
      plugin extraction for `no-unused-vars` override
- [x] Fix all lint errors in `packages/maticjs/src/` (0 errors; 67 advisory
      `no-explicit-any` warnings in public plugin interfaces)
- [x] Two config-level overrides (not inline disables):
  - `no-require-imports` off for `http_request.ts` (webpack BUILD_ENV pattern)
  - `no-default-export` off for `src/index.ts` (semver-major API change, deferred)
- [x] `commitlint.config.js` — conventional commits
- [x] `markdownlint-cli2@^0.21.0`; fix all violations in existing `.md` files
- [x] Fix `README.md` (wrong org, npm commands, outdated structure)
- [x] Fix `examples/README.md` (npm install instructions, file: reference for local dev)

### GitHub Actions — public repo workflow pattern

- [x] Delete `.github/workflows/ci.yml` (npm-based)
- [x] Delete `.github/workflows/github_doc_deploy.yml` (dead since 2022)
- [x] `.github/actions/ci/action.yml` — verbatim copy
- [x] `.github/actions/upsert-changeset-comment/action.yml` — verbatim copy
- [x] `.github/actions/upsert-changeset-comment/dist/index.js` — compiled bundle
- [x] `.github/actions/upsert-changeset-comment/dist/package.json`
- [x] `ci-trigger.yml` — `branches: [master]`, calls `./.github/actions/ci`
- [x] `changeset-check.yml` — local `upsert-changeset-comment` reference
- [x] `changeset-check-trigger.yml` — `branches: [master]`
- [x] `npm-release.yml` — three `main`→`master` substitutions
- [x] `npm-release-trigger.yml` — `branches: [master]`
- [x] `claude-code-review.yml` + `claude-code-review-trigger.yml`
- [x] `claude.yml` + `claude-trigger.yml`

---

## Phase 2 — PR 3: `@maticnetwork/maticjs-viem` ⬜

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
- [ ] `"repository"` with `directory: packages/viem`
- [ ] `"publishConfig": { "access": "public" }`
- [ ] `"files": ["dist", "MIGRATION.md"]`
- [ ] `exports` field (CJS + ESM + types)
- [ ] `peerDependencies`: `@maticnetwork/maticjs: "workspace:*"`, `viem: "^2.0.0"`
- [ ] devDependencies: `tsup`, `vitest`, `typescript`, `@tsconfig/node24`,
      `@tsconfig/node-ts`, `viem`, `@maticnetwork/maticjs`
- [ ] scripts: `build` (`tsup`), `test` (`vitest run`), `typecheck` (`tsc --noEmit`)

### `packages/viem/tsup.config.ts`

- [ ] `entry: ['src/index.ts']`, `format: ['cjs', 'esm']`, `dts: true`,
      `clean: true`, `external: ['@maticnetwork/maticjs', 'viem']`, `target: 'es2020'`

### `packages/viem/tsconfig.json` + `tsconfig.build.json`

- [ ] `tsconfig.json` — extends root + `@tsconfig/node-ts`, includes src + tests
- [ ] `tsconfig.build.json` — composite, `rootDir: src`, includes only src

### `packages/viem/vitest.config.ts`

- [ ] Standard config

### Root `tsconfig.json` update

- [ ] Add `{ "path": "packages/viem/tsconfig.build.json" }` to `references`

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

## Phase 3a — PR 4: Migrate `maticjs-web3` ⬜

Source copied from `0xPolygon/maticjs-web3`. Replaces webpack 4 with tsup.

### `packages/web3/` structure

- [ ] Copy `src/` from `0xPolygon/maticjs-web3`
- [ ] `packages/web3/MIGRATION.md`

### `packages/web3/package.json`

- [ ] `"name": "@maticnetwork/maticjs-web3"` (unchanged npm name)
- [ ] `"repository"` with `directory: packages/web3`
- [ ] `"publishConfig": { "access": "public" }`
- [ ] `"files": ["dist", "MIGRATION.md"]`
- [ ] `exports` field (same pattern as `packages/viem`)
- [ ] peerDependencies: `@maticnetwork/maticjs: "workspace:*"`, `web3: "^1.8.0"`
      (web3 v2 upgrade deferred)
- [ ] devDependencies: `tsup`, `vitest`, `typescript`, `@tsconfig/node24`,
      `@tsconfig/node-ts`, `web3`, `@maticnetwork/maticjs`

### Build / test

- [ ] `packages/web3/tsup.config.ts`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`
- [ ] Replace karma/mocha tests with vitest unit tests

### Root updates

- [ ] Add `{ "path": "packages/web3/tsconfig.build.json" }` to root `tsconfig.json` references

### Post-merge

- [ ] Update `0xPolygon/maticjs-web3` README: "This package has moved to
      [0xPolygon/matic.js](https://github.com/0xPolygon/matic.js). Final
      standalone release: vX.Y.Z."
- [ ] Archive `0xPolygon/maticjs-web3` on GitHub

### Changeset

- [ ] `pnpm exec changeset add` — patch bump for `@maticnetwork/maticjs-web3`

---

## Phase 3b — PR 5: Migrate `maticjs-ethers` ⬜

Same process as PR 4.

### `packages/ethers/` structure

- [ ] Copy `src/` from `0xPolygon/maticjs-ethers`
- [ ] `packages/ethers/MIGRATION.md`

### `packages/ethers/package.json`

- [ ] `"name": "@maticnetwork/maticjs-ethers"` (unchanged npm name)
- [ ] `"repository"` with `directory: packages/ethers`
- [ ] `"publishConfig": { "access": "public" }`
- [ ] `"files": ["dist", "MIGRATION.md"]`
- [ ] `exports` field
- [ ] peerDependencies: `@maticnetwork/maticjs: "workspace:*"`, `ethers: "^5.5.1"`
      (ethers v6 upgrade deferred)
- [ ] devDependencies: `tsup`, `vitest`, `typescript`, `@tsconfig/node24`,
      `@tsconfig/node-ts`, `ethers`, `@maticnetwork/maticjs`

### Build / test

- [ ] `packages/ethers/tsup.config.ts`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`
- [ ] Replace karma/mocha tests with vitest unit tests

### Root updates

- [ ] Add `{ "path": "packages/ethers/tsconfig.build.json" }` to root `tsconfig.json` references

### Post-merge

- [ ] Update `0xPolygon/maticjs-ethers` README, archive repo

### Changeset

- [ ] `pnpm exec changeset add` — patch bump for `@maticnetwork/maticjs-ethers`

---

## Deferred (not in scope for this migration)

| Item                                                  | Reason                                              |
| ----------------------------------------------------- | --------------------------------------------------- |
| Migrate webpack → tsup in `packages/maticjs/`         | Working build; low risk to defer                    |
| Remove `export default` from `src/index.ts`           | Breaking public API change; needs semver-major      |
| Convert `enum` to `const` in `packages/maticjs/src/` | Enables `erasableSyntaxOnly`; significant churn     |
| ethers v6 upgrade                                     | API chasm; own migration guide and PR               |
| web3 v2 upgrade                                       | Same                                                |
| `maticjs-plasma`                                      | Extends `BridgeClient`, not `IPlugin`; stays independent |
| `maticjs-staking`                                     | Same                                                |
