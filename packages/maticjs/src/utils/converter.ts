import type { BaseBigNumber } from '../abstracts';

import { utils } from '../utils';

export class Converter {
  static toHex(amount: BaseBigNumber | string | number) {
    const dataType = typeof amount;
    let converted: BaseBigNumber | string = amount as BaseBigNumber | string;
    if (dataType === 'number') {
      converted = new utils.BN(amount);
    } else if (dataType === 'string') {
      if ((amount as string).slice(0, 2) === '0x') {
        return amount;
      }
      converted = new utils.BN(amount);
    }
    if (utils.BN.isBN(converted)) {
      return '0x' + converted.toString(16);
    } else {
      throw new Error(`Invalid value ${amount}, value is not a number.`);
    }
  }

  static toBN(amount: BaseBigNumber | string | number): BaseBigNumber {
    const dataType = typeof amount;
    let converted: BaseBigNumber | string | number = amount;
    if (dataType === 'string') {
      if ((amount as string).slice(0, 2) === '0x') {
        converted = parseInt(amount as string, 16);
      }
    }
    if (!utils.BN.isBN(converted)) {
      converted = new utils.BN(converted);
    }
    return converted as BaseBigNumber;
  }
}
