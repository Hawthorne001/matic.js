import type { IMapPromiseOption } from '../interfaces';

import { promiseResolve } from '..';

type Converter = (...args: unknown[]) => unknown;

const runPromises = (promises: Array<Promise<any>>, converter: Converter) => {
  const maps = promises.map((val, index) => {
    return converter(val, index);
  });
  return Promise.all(maps);
};

export function mapPromise(
  values: any[],
  converter: Converter,
  option: IMapPromiseOption = {} as any
) {
  const valuesLength = values.length;
  const concurrency = option.concurrency || valuesLength;

  let result = [];
  const limitPromiseRun: () => Promise<any> = () => {
    const promises = values.splice(0, concurrency);
    return runPromises(promises, converter).then((promiseResult) => {
      result = result.concat(promiseResult);

      return valuesLength > result.length ? limitPromiseRun() : promiseResolve(result);
    });
  };

  return limitPromiseRun();
}
