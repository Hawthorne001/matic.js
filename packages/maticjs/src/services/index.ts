import type { NetworkService } from './network_service';

import { config } from '../config';
import { ABIService } from './abi_service';

export * from './network_service';

class Service {
  network: NetworkService;
  zkEvmNetwork: NetworkService;
  abi: ABIService;
}

export const service = new Service();
service.abi = new ABIService(config.abiStoreUrl);
