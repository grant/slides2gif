import createClient from 'openapi-fetch';
import type {paths} from './generated/openapi';
import {API_BASE} from './endpoints';

function defaultFetch(request: Request) {
  return fetch(new Request(request, {credentials: 'include'}));
}

export const fetchClient = createClient<paths>({
  baseUrl: API_BASE,
  fetch: defaultFetch,
});

export type FetchClient = typeof fetchClient;

export function createFetchClient(
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>
) {
  return createClient<paths>({
    baseUrl: API_BASE,
    fetch: async (request: Request) => {
      if (!getHeaders) return defaultFetch(request);
      const extra = await Promise.resolve(getHeaders());
      const headers = new Headers(request.headers);
      for (const [k, v] of Object.entries(extra)) headers.set(k, v);
      return fetch(new Request(request, {credentials: 'include', headers}));
    },
  });
}
