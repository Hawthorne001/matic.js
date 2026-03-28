import { service, NetworkService } from '../services';

export const setProofApi = (url: string) => {
  const urlLength = url.length;
  let normalizedUrl = url[urlLength - 1] !== '/' ? url + '/' : url;
  normalizedUrl += 'api/v1/';
  service.network = new NetworkService(normalizedUrl);
};

export const setZkEvmProofApi = (url: string) => {
  const urlLength = url.length;
  let normalizedUrl = url[urlLength - 1] !== '/' ? url + '/' : url;
  normalizedUrl += 'api/zkevm/';
  service.zkEvmNetwork = new NetworkService(normalizedUrl);
};
