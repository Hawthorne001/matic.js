# @maticnetwork/maticjs

## 3.9.9

### Patch Changes

- b424dd0: Harden `RootChain.findRootBlockFromChild` so it cannot return a checkpoint slot that doesn't actually contain the burn block.

  Two related issues, both fixed:
  - The binary search's single-candidate early exit (`start.eq(end)`) accepted the converged slot without verifying its range contained the child block. When a burn block sat past every existing checkpoint, the search would converge on `currentHeaderBlock / 10000` and silently return that slot — producing a proof that embedded an unrelated or non-existent header. On-chain MPT verification then reverted at submission time. The fix verifies `headerStart ≤ child ≤ headerEnd` for the converged candidate and throws `Burn transaction has not been checkpointed as yet` otherwise (matching the existing `isCheckPointed_` guard message). The throw also covers the case where no checkpoint has ever been submitted (`currentHeaderBlock = 0`).
  - `currentHeaderBlock()` and `headerBlocks(slot)` reads inside `findRootBlockFromChild` ignored `client.config.rootChainDefaultBlock`, defaulting to whatever the underlying provider used (effectively `latest`). `getLastChildBlock` already honoured the config. The two reads could therefore observe different chain views, opening a race where `isCheckPointed_` could pass against an un-finalised checkpoint that was reorged out before the proof was submitted on L1. Both reads now use the same block tag.

  The binary-search algorithm has been extracted into `findCheckpointSlot` for direct unit testing. It is plugin-agnostic — it consumes any `BaseBigNumber` and a constructor factory — so it works correctly with whatever BigNumber implementation the active plugin injects (`MaticBigNumber` for `@maticnetwork/maticjs-ethers`, bn.js for the web3 plugin, etc.).

- b424dd0: Fix `ProofUtil.getReceiptBytes` so `cumulativeGasUsed = 0` encodes as the canonical RLP empty byte string (`0x80`) instead of the literal byte `0x00`.

  The previous encoding wrapped the integer field in `BufferUtil.toBuffer` before handing it to `rlp.encode`. For zero, that produced `<Buffer 00>`, which RLP-encodes to the single byte `0x00` — non-canonical. Bor commits `receiptsRoot` using the canonical form, so the leaf hash produced from a buggy proof never matched the root for any block whose `cumulativeGasUsed` was zero. In practice that meant **every exit proof rooted in a Bor system-tx-only block was rejected on-chain** (Plasma `ERC20PredicateBurnOnly`, Portal `MerklePatriciaProof.verify`) with `INVALID_RECEIPT_MERKLE_PROOF`, even though the API returned `200 OK`.

  The fix passes `cumulativeGasUsed` directly to `rlp.encode`, which canonically encodes `0` as `0x80`. Non-zero values are unaffected.

> **Note:** Version `3.9.8` is skipped. An earlier non-canonical
> `changeset publish` from the `chore/monorepo` branch on 2026-03-29
> burned `3.9.8` on npm with a build that does not correspond to any
> release on `master` (since deprecated). The next release after `3.9.7`
> is `3.9.9`.
