import type { BaseContractMethod } from '../abstracts';
import type { Logger } from '../utils';

export abstract class BaseContract {
  constructor(
    public address: string,
    public logger: Logger
  ) {}

  abstract method(methodName: string, ...args): BaseContractMethod;
}
