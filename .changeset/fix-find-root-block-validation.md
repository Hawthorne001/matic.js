---
'@maticnetwork/maticjs': patch
---

Harden `RootChain.findRootBlockFromChild` so it cannot return a checkpoint slot that doesn't actually contain the burn block.

Two related issues, both fixed:

- The binary search's single-candidate early exit (`start.eq(end)`) accepted the converged slot without verifying its range contained the child block. When a burn block sat past every existing checkpoint, the search would converge on `currentHeaderBlock / 10000` and silently return that slot — producing a proof that embedded an unrelated or non-existent header. On-chain MPT verification then reverted at submission time. The fix verifies `headerStart ≤ child ≤ headerEnd` for the converged candidate and throws `Burn transaction has not been checkpointed as yet` otherwise (matching the existing `isCheckPointed_` guard message). The throw also covers the case where no checkpoint has ever been submitted (`currentHeaderBlock = 0`).

- `currentHeaderBlock()` and `headerBlocks(slot)` reads inside `findRootBlockFromChild` ignored `client.config.rootChainDefaultBlock`, defaulting to whatever the underlying provider used (effectively `latest`). `getLastChildBlock` already honoured the config. The two reads could therefore observe different chain views, opening a race where `isCheckPointed_` could pass against an un-finalised checkpoint that was reorged out before the proof was submitted on L1. Both reads now use the same block tag.

The binary-search algorithm has been extracted into `findCheckpointSlot` for direct unit testing. It is plugin-agnostic — it consumes any `BaseBigNumber` and a constructor factory — so it works correctly with whatever BigNumber implementation the active plugin injects (`MaticBigNumber` for `@maticnetwork/maticjs-ethers`, bn.js for the web3 plugin, etc.).
