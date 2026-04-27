---
'@maticnetwork/maticjs': patch
---

Ship `README.md` and `LICENSE` in the published npm package.

Previous releases were missing both: the package directory
(`packages/maticjs/`) had neither file, and npm's auto-include only
looks at the package directory, not the workspace root. Consumers
running `npm view @maticnetwork/maticjs readme` saw nothing.

Adds `packages/maticjs/README.md` (consumer-facing, with install,
docs, source, and support links) and `packages/maticjs/LICENSE`
(copy of the workspace MIT licence). Both auto-include on publish —
no `files` field change needed.
