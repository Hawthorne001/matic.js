import type { BaseBigNumber } from '..';
import type { IPOSClientConfig } from '../interfaces';
import type { TYPE_AMOUNT } from '../types';
import type { Web3SideChainClient } from '../utils';

import { BaseToken, utils } from '../utils';

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

  getLastChildBlock() {
    return this.method('getLastChildBlock').then((method) => {
      return method.read<string>({}, this.client.config.rootChainDefaultBlock || 'safe');
    });
  }

  async findRootBlockFromChild(childBlockNumber: TYPE_AMOUNT): Promise<BaseBigNumber> {
    const bigOne = new utils.BN(1);
    const bigtwo = new utils.BN(2);
    const checkPointInterval = new utils.BN(10000);

    const bnChildBlock = new utils.BN(childBlockNumber);
    // first checkpoint id = start * 10000
    let start = bigOne;

    // last checkpoint id = end * 10000
    const method = await this.method('currentHeaderBlock');
    const currentHeaderBlock = await method.read<string>();
    let end = new utils.BN(currentHeaderBlock).div(checkPointInterval);

    // binary search on all the checkpoints to find the checkpoint that contains the childBlockNumber
    let ans;
    while (start.lte(end)) {
      if (start.eq(end)) {
        ans = start;
        break;
      }
      const mid = start.add(end).div(bigtwo);
      const headerBlocksMethod = await this.method(
        'headerBlocks',
        mid.mul(checkPointInterval).toString()
      );
      const headerBlock = await headerBlocksMethod.read<{ start: number; end: number }>();

      const headerStart = new utils.BN(headerBlock.start);
      const headerEnd = new utils.BN(headerBlock.end);

      if (headerStart.lte(bnChildBlock) && bnChildBlock.lte(headerEnd)) {
        // if bnChildBlock is between the upper and lower bounds of the headerBlock, we found our answer
        ans = mid;
        break;
      } else if (headerStart.gt(bnChildBlock)) {
        // bnChildBlock was checkpointed before this header
        end = mid.sub(bigOne);
      } else if (headerEnd.lt(bnChildBlock)) {
        // bnChildBlock was checkpointed after this header
        start = mid.add(bigOne);
      }
    }
    return ans.mul(checkPointInterval);
  }
}
