---
'@maticnetwork/maticjs': patch
---

Fix `ProofUtil.getReceiptBytes` so `cumulativeGasUsed = 0` encodes as the canonical RLP empty byte string (`0x80`) instead of the literal byte `0x00`.

The previous encoding wrapped the integer field in `BufferUtil.toBuffer` before handing it to `rlp.encode`. For zero, that produced `<Buffer 00>`, which RLP-encodes to the single byte `0x00` — non-canonical. Bor commits `receiptsRoot` using the canonical form, so the leaf hash produced from a buggy proof never matched the root for any block whose `cumulativeGasUsed` was zero. In practice that meant **every exit proof rooted in a Bor system-tx-only block was rejected on-chain** (Plasma `ERC20PredicateBurnOnly`, Portal `MerklePatriciaProof.verify`) with `INVALID_RECEIPT_MERKLE_PROOF`, even though the API returned `200 OK`.

The fix passes `cumulativeGasUsed` directly to `rlp.encode`, which canonically encodes `0` as `0x80`. Non-zero values are unaffected.
