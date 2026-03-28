# Manual test scripts

These are developer scratch scripts for manually testing the library against live
networks. They require real RPC endpoints and wallet private keys — they are not
automated tests and are never run in CI.

- `debug.js` — PoS and zkEVM operations using the web3 provider plugin
- `ether.js` — PoS and zkEVM operations using the ethers provider plugin
- `config.js` — shared RPC URLs and contract addresses (testnet defaults pre-filled)

## Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Then install dependencies (this directory is standalone, not part of the pnpm workspace):

```bash
npm install
```

## Running

```bash
node debug.js
node ether.js
```

Most operations are commented out — uncomment the one you want to run.
