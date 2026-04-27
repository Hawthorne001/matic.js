const fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> = (() => {
  if (process.env.BUILD_ENV === 'node') {
    return require('node-fetch').default;
  }
  return window.fetch;
})();

export class HttpRequest {
  baseUrl = '';

  constructor(option: { baseUrl: string } | string = {} as any) {
    const normalized = typeof option === 'string' ? { baseUrl: option } : option;

    if (normalized.baseUrl) {
      this.baseUrl = normalized.baseUrl;
    }
  }

  get<T>(url = '', query = {}): Promise<T> {
    const fullUrl =
      this.baseUrl +
      url +
      Object.keys(query)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');

    return fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }).then((res) => {
      return res.json();
    });
  }

  post(url = '', body) {
    const fullUrl = this.baseUrl + url;

    return fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    }).then((res) => {
      return res.json();
    });
  }
}
