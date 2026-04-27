import type { IContractInitParam, IZkEvmClientConfig, IZkEvmContracts } from '../interfaces';
import type { Web3SideChainClient } from '../utils';

import { BaseToken } from '../utils';

export class ZkEvmToken extends BaseToken<IZkEvmClientConfig> {
  constructor(
    contractParam: IContractInitParam,
    client: Web3SideChainClient<IZkEvmClientConfig>,
    protected getZkEvmContracts: () => IZkEvmContracts
  ) {
    super(contractParam, client);
  }

  protected get parentBridge() {
    return this.getZkEvmContracts().parentBridge;
  }

  protected get zkEVMWrapper() {
    return this.getZkEvmContracts().zkEVMWrapper;
  }

  protected get childBridge() {
    return this.getZkEvmContracts().childBridge;
  }

  protected get bridgeUtil() {
    return this.getZkEvmContracts().bridgeUtil;
  }
}
