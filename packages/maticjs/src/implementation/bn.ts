import { throwNotImplemented } from '..';
import { BaseBigNumber } from '../abstracts';

export class EmptyBigNumber extends BaseBigNumber {
  constructor(_value: unknown) {
    super();
  }

  toString(_base?: number) {
    return throwNotImplemented<string>();
  }

  toNumber() {
    return throwNotImplemented<number>();
  }

  add(_value: BaseBigNumber) {
    return throwNotImplemented<BaseBigNumber>();
  }

  sub(_value: BaseBigNumber) {
    return throwNotImplemented<BaseBigNumber>();
  }

  mul(_value: BaseBigNumber) {
    return throwNotImplemented<BaseBigNumber>();
  }

  div(_value: BaseBigNumber) {
    return throwNotImplemented<BaseBigNumber>();
  }

  lte(_value: BaseBigNumber) {
    return throwNotImplemented<boolean>();
  }

  lt(_value: BaseBigNumber) {
    return throwNotImplemented<boolean>();
  }

  gte(_value: BaseBigNumber) {
    return throwNotImplemented<boolean>();
  }

  gt(_value: BaseBigNumber) {
    return throwNotImplemented<boolean>();
  }

  eq(_value: BaseBigNumber) {
    return throwNotImplemented<boolean>();
  }
}
