import type { ITransactionOption, IZkEvmClientConfig } from '../interfaces';
import type { TYPE_AMOUNT } from '../types';
import type { Web3SideChainClient } from '../utils';

import { BaseToken, Converter } from '../utils';

/**
 * ZkEVMBridgeAdapter used ZkEVMBridge to implement additional custom features
 * like bridging custom ERC20
 */
export class ZkEVMBridgeAdapter extends BaseToken<IZkEvmClientConfig> {
  constructor(
    client_: Web3SideChainClient<IZkEvmClientConfig>,
    address: string,
    isParent: boolean
  ) {
    super(
      {
        address: address,
        name: 'ZkEVMBridgeAdapter',
        bridgeType: 'zkevm',
        isParent: isParent // decides if it's a child chain or a root chain adapter
      },
      client_
    );
  }

  method(methodName: string, ...args) {
    return this.getContract().then((contract) => {
      return contract.method(methodName, ...args);
    });
  }

  /**
   * uses the bridge function present in the adapter contract
   * @param recipient
   * @param amount
   * @param forceUpdateGlobalExitRoot
   * @param option
   *
   * @returns
   * @memberof ZkEvmCustomBridge
   */
  bridgeToken(
    recipient: string,
    amount: TYPE_AMOUNT,
    forceUpdateGlobalExitRoot?: boolean,
    option?: ITransactionOption
  ) {
    return this.method(
      'bridgeToken',
      recipient,
      Converter.toHex(amount),
      forceUpdateGlobalExitRoot
    ).then((method) => {
      return this.processWrite(method, option);
    });
  }
}
