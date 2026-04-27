# Matic SDK

[![npm version](https://img.shields.io/npm/v/@maticnetwork/maticjs.svg)](https://www.npmjs.com/package/@maticnetwork/maticjs)
[![CI](https://github.com/0xPolygon/matic.js/actions/workflows/ci-trigger.yml/badge.svg?branch=master)](https://github.com/0xPolygon/matic.js/actions/workflows/ci-trigger.yml)
[![Release](https://github.com/0xPolygon/matic.js/actions/workflows/npm-release-trigger.yml/badge.svg?branch=master)](https://github.com/0xPolygon/matic.js/actions/workflows/npm-release-trigger.yml)
[![License: MIT](https://img.shields.io/npm/l/@maticnetwork/maticjs.svg)](LICENSE)

This repository contains the `maticjs` client library. `maticjs` makes it easy for developers,
who may not be deeply familiar with smart contract development, to interact with the various
components of Matic Network.

This library will help developers to move assets from Ethereum chain to Matic chain, and withdraw
from Matic to Ethereum using fraud proofs.

## Docs

[https://docs.polygon.technology/tools/matic-js/get-started](https://docs.polygon.technology/tools/matic-js/get-started)

## Support

Our [Discord](https://discord.com/invite/0xpolygonrnd) is the best way to reach us ✨.

## Contributors

You are very welcome to contribute, please see contributing guidelines - [[Contribute](CONTRIBUTING.md)].

Thank you to all the people who already contributed to matic.js!

[![Contributors](https://contrib.rocks/image?repo=maticnetwork/matic.js)](https://github.com/maticnetwork/matic.js/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).

## Development

This is a pnpm monorepo. The published package lives in `packages/maticjs/`.

### Setup

```bash
pnpm install
```

### Lint

```bash
pnpm run lint
```

### Typecheck

```bash
pnpm run typecheck
```

### Build

```bash
pnpm run build
```

### Publish

Releases are managed via [changesets](https://github.com/changesets/changesets).

```bash
# Add a changeset describing your change
pnpm exec changeset add

# The release workflow publishes automatically on merge to master
```

## License

MIT
