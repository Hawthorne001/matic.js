import type { IBaseBlock } from './block';
import type { ITransactionData } from './transaction_data';

export interface IBlockWithTransaction extends IBaseBlock {
  transactions: ITransactionData[];
}
