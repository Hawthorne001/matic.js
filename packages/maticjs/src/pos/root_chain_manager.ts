import type { IPOSClientConfig, ITransactionOption } from '../interfaces';
import type { Web3SideChainClient } from '../utils';

import { BaseToken } from '../utils';

export class RootChainManager extends BaseToken<IPOSClientConfig> {
  constructor(client_: Web3SideChainClient<IPOSClientConfig>, address: string) {
    super(
      {
        address: address,
        name: 'RootChainManager',
        bridgeType: 'pos',
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

  deposit(
    userAddress: string,
    tokenAddress: string,
    depositData: string,
    option?: ITransactionOption
  ) {
    return this.method('depositFor', userAddress, tokenAddress, depositData).then((method) => {
      return this.processWrite(method, option);
    });
  }

  exit(exitPayload: string, option: ITransactionOption) {
    return this.method('exit', exitPayload).then((method) => {
      return this.processWrite(method, option);
    });
  }

  isExitProcessed(exitHash: string) {
    return this.method('processedExits', exitHash).then((method) => {
      return this.processRead<boolean>(method);
    });
  }
}
