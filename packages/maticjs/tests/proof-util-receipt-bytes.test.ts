/**
 * Unit tests for ProofUtil.getReceiptBytes RLP encoding.
 *
 * Bug — non-canonical encoding of cumulativeGasUsed = 0
 *   getReceiptBytes used to wrap every receipt field in BufferUtil.toBuffer
 *   before passing to rlp.encode. For an integer field whose value is 0,
 *   BufferUtil.toBuffer(0) returns <Buffer 00>, which RLP-encodes to the
 *   single byte 0x00 (per spec: bytes < 0x80 encode as themselves). The
 *   canonical RLP encoding of integer 0 is the empty byte string 0x80.
 *
 *   Bor (go-ethereum) writes receiptsRoot using the canonical encoding, so
 *   the leaf hash produced from the buggy encoding never matches the trie
 *   root for blocks where cumulativeGasUsed = 0 — i.e. Bor system-tx-only
 *   blocks. On-chain MPT verifiers (Plasma ERC20PredicateBurnOnly, Portal
 *   MerklePatriciaProof.verify) revert with INVALID_RECEIPT_MERKLE_PROOF.
 *
 *   The fix is to pass the integer directly to rlp.encode (which canonically
 *   encodes 0 → 0x80) instead of pre-converting via BufferUtil.toBuffer.
 */

import rlp from 'rlp';
import { describe, expect, it } from 'vitest';

import type { ITransactionReceipt } from '../src/interfaces';

import { ProofUtil } from '../src/utils/proof_util';

const HEX_BLOOM_256 = '0x' + '00'.repeat(256);

const baseReceipt = (
  overrides: Partial<ITransactionReceipt> = {}
): ITransactionReceipt => ({
  transactionHash: '0x' + '00'.repeat(32),
  transactionIndex: 0,
  blockHash: '0x' + '00'.repeat(32),
  blockNumber: 0,
  from: '0x' + '00'.repeat(20),
  to: '0x' + '00'.repeat(20),
  contractAddress: '0x' + '00'.repeat(20),
  cumulativeGasUsed: 0,
  gasUsed: 0,
  status: true,
  logsBloom: HEX_BLOOM_256,
  root: '',
  type: '0x0',
  logs: [],
  ...overrides
});

describe('ProofUtil.getReceiptBytes — canonical RLP for cumulativeGasUsed', () => {
  it('encodes cumulativeGasUsed = 0 as the empty byte string (0x80), not 0x00', () => {
    const bytes = ProofUtil.getReceiptBytes(baseReceipt({ cumulativeGasUsed: 0 }));

    // Decode the outer RLP list: [status, cumulativeGasUsed, logsBloom, logs].
    const decoded = rlp.decode(bytes) as unknown as Uint8Array[];
    expect(decoded).to.have.length(4);

    // Canonical RLP for integer 0 is the empty byte string. After decoding the
    // RLP wrapper, that materialises as a zero-length buffer; the bug (encoding
    // <Buffer 00>) would decode to a 1-byte buffer of value 0x00.
    const cumulativeGasUsedBytes = decoded[1] as Uint8Array;
    expect(cumulativeGasUsedBytes.length, 'cumulativeGasUsed must decode to empty bytes (canonical 0)').to.equal(0);
  });

  it('encodes a non-zero cumulativeGasUsed without leading zero bytes', () => {
    const bytes = ProofUtil.getReceiptBytes(baseReceipt({ cumulativeGasUsed: 0x21000 }));
    const decoded = rlp.decode(bytes) as unknown as Uint8Array[];
    const cumulativeGasUsedBytes = decoded[1] as Uint8Array;
    // 0x21000 → three bytes [0x02, 0x10, 0x00] with no leading zero
    expect(Buffer.from(cumulativeGasUsedBytes).toString('hex')).to.equal('021000');
  });

  it('produces a valid RLP receipt that round-trips via decode/encode unchanged', () => {
    const receipt = baseReceipt({ cumulativeGasUsed: 0 });
    const bytes = ProofUtil.getReceiptBytes(receipt);
    const decoded = rlp.decode(bytes);
    const reEncoded = Buffer.from(rlp.encode(decoded));
    expect(Buffer.from(bytes).toString('hex')).to.equal(reEncoded.toString('hex'));
  });
});
