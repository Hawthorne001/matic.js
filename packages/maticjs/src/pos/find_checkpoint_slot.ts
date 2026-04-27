import type { BaseBigNumber } from '../abstracts/base_big_number';

/**
 * Pure binary-search helper for locating the checkpoint slot that contains a
 * given child-chain block. Extracted from `RootChain.findRootBlockFromChild`
 * so the algorithm can be unit-tested without instantiating the class
 * hierarchy or the plugin-injected `utils.BN`.
 *
 * The helper is plugin-agnostic: it uses only the methods declared on
 * `BaseBigNumber`, which every plugin's BigNumber implementation extends
 * (`MaticBigNumber` for `@maticnetwork/maticjs-ethers`, bn.js for the web3
 * plugin, and so on). The constructor for those instances is plugin-specific,
 * so the caller passes it in via the `bn` factory.
 *
 * Two correctness properties this helper enforces — both broken in earlier
 * inline versions of the algorithm:
 *
 *  1. The single-candidate early exit (`start.eq(end)`) verifies that the
 *     candidate's range actually contains the child block. Without this
 *     check, a child block past every existing checkpoint causes the search
 *     to converge on `currentHeaderBlock / 10000` and falsely accept it,
 *     producing a proof that embeds a non-existent or unrelated checkpoint.
 *
 *  2. The two contract reads (`currentHeaderBlock`, `headerBlocks(slot)`) are
 *     parameterised on a single block tag — the caller wires both reads to
 *     the same L1 block tag as the upstream existence check, so the search
 *     and the existence check observe a consistent chain view.
 */

export type BNFactory = (value: number | string) => BaseBigNumber;

export interface CheckpointSlotInputs {
  /** Constructs a BigNumber of the same plugin-injected type as the inputs. */
  bn: BNFactory;
  /** Child-chain block number whose containing checkpoint we want. */
  childBlockNumber: BaseBigNumber;
  /** Reads the RootChain `currentHeaderBlock()` storage value. */
  readCurrentHeaderBlock: () => Promise<BaseBigNumber>;
  /** Reads `headerBlocks(headerId)` for `headerId = slot * CHECKPOINT_INTERVAL`. */
  readHeaderBlocks: (headerId: BaseBigNumber) => Promise<{ start: BaseBigNumber; end: BaseBigNumber }>;
}

/**
 * @returns the header id (`slot * CHECKPOINT_INTERVAL`) of the checkpoint
 * containing the child block.
 * @throws if the child block is not contained in any submitted checkpoint.
 */
export async function findCheckpointSlot(opts: CheckpointSlotInputs): Promise<BaseBigNumber> {
  const { bn, childBlockNumber, readCurrentHeaderBlock, readHeaderBlocks } = opts;

  const ONE = bn(1);
  const TWO = bn(2);
  const CHECKPOINT_INTERVAL = bn(10000);

  const currentHeaderBlock = await readCurrentHeaderBlock();
  let start = ONE;
  let end = currentHeaderBlock.div(CHECKPOINT_INTERVAL);

  while (start.lte(end)) {
    if (start.eq(end)) {
      // The search collapsed to a single candidate, but that does not by
      // itself prove the candidate contains the child block. If the child
      // block sits past every existing checkpoint, the loop converges on
      // `currentHeaderBlock / CHECKPOINT_INTERVAL` and would otherwise be
      // returned as a false positive. Verify against the candidate's range.
      const headerBlock = await readHeaderBlocks(start.mul(CHECKPOINT_INTERVAL));
      if (headerBlock.start.lte(childBlockNumber) && childBlockNumber.lte(headerBlock.end)) {
        return start.mul(CHECKPOINT_INTERVAL);
      }
      throw new Error('Burn transaction has not been checkpointed as yet');
    }
    const mid = start.add(end).div(TWO);
    const headerBlock = await readHeaderBlocks(mid.mul(CHECKPOINT_INTERVAL));
    if (headerBlock.start.lte(childBlockNumber) && childBlockNumber.lte(headerBlock.end)) {
      return mid.mul(CHECKPOINT_INTERVAL);
    } else if (headerBlock.start.gt(childBlockNumber)) {
      end = mid.sub(ONE);
    } else if (headerBlock.end.lt(childBlockNumber)) {
      start = mid.add(ONE);
    }
  }
  // Loop exited without converging (e.g. currentHeaderBlock = 0 before any
  // checkpoint has ever been submitted, so end < start on entry).
  throw new Error('Burn transaction has not been checkpointed as yet');
}
