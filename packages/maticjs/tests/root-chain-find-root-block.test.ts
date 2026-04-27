/**
 * Unit tests for the binary-search helper underlying
 * RootChain.findRootBlockFromChild.
 *
 * Bug 1 — early-exit at `start.eq(end)` returned without verifying the candidate
 *
 *   The binary search converged on a single slot when the search range narrowed
 *   to one element, and accepted it as the answer with no membership check. If
 *   the child block sat past every existing checkpoint, the search would
 *   converge on `currentHeaderBlock / 10000` and return that slot as if it
 *   contained the burn — a false positive that produced a proof embedding a
 *   non-existent or unrelated checkpoint header. On-chain verification then
 *   reverted.
 *
 *   The fix verifies `headerStart ≤ child ≤ headerEnd` for the converged
 *   candidate and throws "Burn transaction has not been checkpointed as yet"
 *   otherwise — matching the existing error message thrown by the upstream
 *   `isCheckPointed_` guard.
 *
 * Bug 2 — `currentHeaderBlock` and `headerBlocks` reads ignored rootChainDefaultBlock
 *
 *   `getLastChildBlock` honoured `client.config.rootChainDefaultBlock` (defaulting
 *   to `safe`) so callers could opt into reading from a stable L1 block tag.
 *   `findRootBlockFromChild` did not — it called `method.read()` with no block
 *   tag, defaulting to whatever the underlying provider used (effectively
 *   `latest`). The existence check and the proof-construction reads therefore
 *   observed potentially different chain states, opening a window for a proof
 *   to be generated against state that the L1 contract no longer exposed at
 *   submission time.
 *
 *   Bug 2 is exercised at the call site (RootChain wires both reads to the
 *   same `block` tag); these tests cover Bug 1 — the pure-helper algorithm —
 *   directly. The helper is plugin-agnostic (it consumes any `BaseBigNumber`),
 *   so we exercise it with `bn.js` for convenience; production paths use
 *   whatever BigNumber the active plugin injects.
 */

import BN from 'bn.js';
import { describe, expect, it } from 'vitest';

import type { BaseBigNumber } from '../src/abstracts/base_big_number';

import { findCheckpointSlot } from '../src/pos/find_checkpoint_slot';

interface HeaderBlock {
  start: BaseBigNumber;
  end: BaseBigNumber;
}

const bnFactory = (value: number | string) => new BN(value) as unknown as BaseBigNumber;
const bn = (value: number) => bnFactory(value);

function makeReader(opts: {
  currentHeaderBlock: number;
  headerBlocksBySlot: Record<number, { start: number; end: number }>;
}) {
  const headerBlocksReads: BaseBigNumber[] = [];
  const reader = {
    readCurrentHeaderBlock: async () => bn(opts.currentHeaderBlock),
    readHeaderBlocks: async (headerId: BaseBigNumber): Promise<HeaderBlock> => {
      headerBlocksReads.push(headerId);
      const slot = Number(headerId.toString()) / 10000;
      const entry = opts.headerBlocksBySlot[slot];
      if (!entry) {
        throw new Error(
          `unexpected headerBlocks slot ${headerId.toString()} (slot=${slot})`
        );
      }
      return { start: bn(entry.start), end: bn(entry.end) };
    },
    get headerBlocksReads() {
      return headerBlocksReads;
    }
  };
  return reader;
}

describe('findCheckpointSlot — happy path', () => {
  it('returns the slot when the burn block sits inside an existing checkpoint', async () => {
    // 4 checkpoints, child block 25500 lives in slot 3 (covers 20001..30000).
    const reader = makeReader({
      currentHeaderBlock: 40000,
      headerBlocksBySlot: {
        1: { start: 1, end: 10000 },
        2: { start: 10001, end: 20000 },
        3: { start: 20001, end: 30000 },
        4: { start: 30001, end: 40000 }
      }
    });
    const ans = await findCheckpointSlot({
      bn: bnFactory,
      childBlockNumber: bn(25500),
      readCurrentHeaderBlock: reader.readCurrentHeaderBlock,
      readHeaderBlocks: reader.readHeaderBlocks
    });
    expect(ans.toString(), 'returns slot 3 (id 30000)').to.equal('30000');
  });

  it('locates the burn in the first checkpoint (search drifts left)', async () => {
    const reader = makeReader({
      currentHeaderBlock: 40000,
      headerBlocksBySlot: {
        1: { start: 1, end: 10000 },
        2: { start: 10001, end: 20000 },
        3: { start: 20001, end: 30000 },
        4: { start: 30001, end: 40000 }
      }
    });
    const ans = await findCheckpointSlot({
      bn: bnFactory,
      childBlockNumber: bn(5),
      readCurrentHeaderBlock: reader.readCurrentHeaderBlock,
      readHeaderBlocks: reader.readHeaderBlocks
    });
    expect(ans.toString(), 'returns slot 1 (id 10000)').to.equal('10000');
  });

  it('handles a single-checkpoint chain that does contain the burn (degenerate range, valid hit)', async () => {
    const reader = makeReader({
      currentHeaderBlock: 10000,
      headerBlocksBySlot: { 1: { start: 1, end: 10000 } }
    });
    const ans = await findCheckpointSlot({
      bn: bnFactory,
      childBlockNumber: bn(5000),
      readCurrentHeaderBlock: reader.readCurrentHeaderBlock,
      readHeaderBlocks: reader.readHeaderBlocks
    });
    expect(ans.toString()).to.equal('10000');
  });
});

describe('findCheckpointSlot — past-tip rejection (Bug 1)', () => {
  it('throws when the burn block is past every existing checkpoint (search converges on last slot)', async () => {
    // Last checkpoint covers up to 30000. Burn at 30622 — 622 blocks past the
    // chain's last checkpoint (the same shape as the production repro on
    // Amoy: burn block 37337056 vs checkpoint end 37336434). Without the fix,
    // the search converges on slot 3 via the start.eq(end) early-exit and
    // returns 30000 silently.
    const reader = makeReader({
      currentHeaderBlock: 30000,
      headerBlocksBySlot: {
        1: { start: 1, end: 10000 },
        2: { start: 10001, end: 20000 },
        3: { start: 20001, end: 30000 }
      }
    });
    await expect(
      findCheckpointSlot({
        bn: bnFactory,
        childBlockNumber: bn(30622),
        readCurrentHeaderBlock: reader.readCurrentHeaderBlock,
        readHeaderBlocks: reader.readHeaderBlocks
      })
    ).rejects.toThrow('Burn transaction has not been checkpointed as yet');
  });

  it('throws when no checkpoint has ever been submitted (currentHeaderBlock = 0)', async () => {
    const reader = makeReader({ currentHeaderBlock: 0, headerBlocksBySlot: {} });
    await expect(
      findCheckpointSlot({
        bn: bnFactory,
        childBlockNumber: bn(1),
        readCurrentHeaderBlock: reader.readCurrentHeaderBlock,
        readHeaderBlocks: reader.readHeaderBlocks
      })
    ).rejects.toThrow('Burn transaction has not been checkpointed as yet');
    // No headerBlocks reads at all — loop exits before the first iteration.
    expect(reader.headerBlocksReads).to.have.length(0);
  });

  it('throws when the burn block sits exactly one block past the last checkpoint', async () => {
    const reader = makeReader({
      currentHeaderBlock: 10000,
      headerBlocksBySlot: { 1: { start: 1, end: 10000 } }
    });
    await expect(
      findCheckpointSlot({
        bn: bnFactory,
        childBlockNumber: bn(10001),
        readCurrentHeaderBlock: reader.readCurrentHeaderBlock,
        readHeaderBlocks: reader.readHeaderBlocks
      })
    ).rejects.toThrow('Burn transaction has not been checkpointed as yet');
  });
});
