# Examples

This folder contains example scripts for various matic.js use cases.

- `pos/` — PoS bridge examples
- `zkevm/` — zkEVM bridge examples

## How to use

### 1. Set configuration

Copy `.env.example` to `.env` and fill in your values. Contract addresses and
RPC URLs are pre-filled for testnet in `config.js` — change them as needed.

**Note:** Never commit your private key or share it publicly.

### 2. Install dependencies

This directory is a standalone project — install with npm directly (it is not
part of the pnpm workspace):

```bash
npm install
```

### 3. Run a script

```bash
node pos/erc20/balance.js
```

## Run against local source

To test against a local build of the library rather than the published npm version:

### 1. Build the package

From the monorepo root:

```bash
pnpm --filter @maticnetwork/maticjs run build
```

### 2. Point the dependency at the local package

In `examples/package.json`, change:

```json
"@maticnetwork/maticjs": "^3.9.2"
```

to:

```json
"@maticnetwork/maticjs": "file:../packages/maticjs"
```

Then re-run `npm install`. No linking required.
