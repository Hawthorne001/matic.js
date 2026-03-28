import type { IZkEvmClientConfig, IZkEvmContracts } from '../interfaces';

import { config as urlConfig } from '../config';
import { service, NetworkService } from '../services';
import { ZkEvmBridgeClient } from '../utils';
import { BridgeUtil } from './bridge_util';
import { ERC20 } from './erc20';
import { ZkEvmBridge } from './zkevm_bridge';
import { ZkEVMWrapper } from './zkevm_wrapper';

export * from './zkevm_bridge';
export * from './bridge_util';
export * from './zkevm_wrapper';

export class ZkEvmClient extends ZkEvmBridgeClient {
  zkEVMWrapper: ZkEVMWrapper;

  init(config: IZkEvmClientConfig) {
    const client = this.client;

    return client.init(config).then(() => {
      const mainZkEvmContracts = client.mainZkEvmContracts;
      const zkEvmContracts = client.zkEvmContracts;
      const mergedConfig = Object.assign(
        {
          parentBridge: mainZkEvmContracts.PolygonZkEVMBridgeProxy,
          childBridge: zkEvmContracts.PolygonZkEVMBridge,
          zkEVMWrapper: mainZkEvmContracts.ZkEVMWrapper
        } as IZkEvmClientConfig,
        config
      );
      client.config = mergedConfig;

      this.rootChainBridge = new ZkEvmBridge(this.client, mergedConfig.parentBridge, true);

      this.childChainBridge = new ZkEvmBridge(this.client, mergedConfig.childBridge, false);

      this.zkEVMWrapper = new ZkEVMWrapper(this.client, mergedConfig.zkEVMWrapper);

      this.bridgeUtil = new BridgeUtil(this.client);

      if (!service.zkEvmNetwork) {
        if (urlConfig.zkEvmBridgeService[urlConfig.zkEvmBridgeService.length - 1] !== '/') {
          urlConfig.zkEvmBridgeService += '/';
        }
        urlConfig.zkEvmBridgeService += 'api/zkevm/';
        service.zkEvmNetwork = new NetworkService(urlConfig.zkEvmBridgeService);
      }

      return this;
    });
  }

  /**
   * creates instance of ERC20 token
   *
   * @param {string} tokenAddress
   * @param {boolean} isParent
   *
   * @param bridgeAdapterAddress Needed if a custom erc20 token is being bridged
   * @returns
   * @memberof ERC20
   */
  erc20(tokenAddress: string, isParent?: boolean, bridgeAdapterAddress?: string) {
    return new ERC20(
      tokenAddress,
      isParent,
      bridgeAdapterAddress,
      this.client,
      this.getContracts_.bind(this)
    );
  }

  private getContracts_() {
    return {
      parentBridge: this.rootChainBridge,
      childBridge: this.childChainBridge,
      bridgeUtil: this.bridgeUtil,
      zkEVMWrapper: this.zkEVMWrapper
    } as IZkEvmContracts;
  }
}
