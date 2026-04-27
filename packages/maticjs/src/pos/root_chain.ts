import type { BaseBigNumber } from '..';
import type { IPOSClientConfig } from '../interfaces';
import type { TYPE_AMOUNT } from '../types';
import type { Web3SideChainClient } from '../utils';

import { BaseToken, utils } from '../utils';
import { findCheckpointSlot } from './find_checkpoint_slot';

export class RootChain extends BaseToken<IPOSClientConfig> {
  constructor(client_: Web3SideChainClient<IPOSClientConfig>, address: string) {
    super(
      {
        address: address,
        name: 'RootChain',
        isParent: true
      },
      client_
    );
  }

  method(methodName: string, ...args) {
    return this.getContract().then((contract) => {
      return contract.method(methodName, ...args);
    });
  }

  private get defaultReadBlock() {
    return this.client.config.rootChainDefaultBlock || 'safe';
  }

  getLastChildBlock() {
    return this.method('getLastChildBlock').then((method) => {
      return method.read<string>({}, this.defaultReadBlock);
    });
  }

  async findRootBlockFromChild(childBlockNumber: TYPE_AMOUNT): Promise<BaseBigNumber> {
    // All reads in this function pin to the same L1 block tag as
    // `getLastChildBlock`, so the existence check (isCheckPointed_) and the
    // header lookup observe a consistent chain view. Without this,
    // `getLastChildBlock` read at e.g. `safe` while `currentHeaderBlock` and
    // `headerBlocks` defaulted to whatever the provider used (effectively
    // `latest`) — a window where the existence check could pass against an
    // un-finalised checkpoint that was reorged out before the proof reached
    // L1.
    const block = this.defaultReadBlock;

    return findCheckpointSlot({
      bn: (value) => new utils.BN(value),
      childBlockNumber: new utils.BN(childBlockNumber.toString()),
      readCurrentHeaderBlock: async () => {
        const m = await this.method('currentHeaderBlock');
        const value = await m.read<string>({}, block);
        return new utils.BN(value);
      },
      readHeaderBlocks: async (headerId) => {
        const m = await this.method('headerBlocks', headerId.toString());
        const headerBlock = await m.read<{ start: number | string; end: number | string }>(
          {},
          block
        );
        return {
          start: new utils.BN(headerBlock.start),
          end: new utils.BN(headerBlock.end)
        };
      }
    });
  }
}
