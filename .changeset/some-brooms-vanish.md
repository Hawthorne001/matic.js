---
'@maticnetwork/maticjs': patch
---

Republish 3.9.9 as 3.9.10 with the missing `dist/` directory.

3.9.9's tarball was 3 files / 2.4 KB instead of the usual ~106 files /
4.2 MB — `dist/` is gitignored and the canonical release flow doesn't
run a build before `changeset publish`, so the published package
contained only `package.json`, `MIGRATION.md`, and `license.js`.
Consumers installing 3.9.9 got a package with no compiled code.

Fixed by adding `"prepublishOnly": "pnpm run build"` to
`packages/maticjs/package.json`. `prepublishOnly` is an npm lifecycle
hook that runs immediately before `npm publish`, so the build always
runs regardless of which release path (canonical CI, manual local
publish, etc.) invokes the publish.

3.9.9 has been deprecated on npm; install 3.9.10 to actually receive
the canonical RLP encoding fix and `RootChain.findRootBlockFromChild`
hardening from
[matic.js#465](https://github.com/0xPolygon/matic.js/pull/465).
