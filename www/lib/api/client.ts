/**
 * Typed API client (Zodios). Uses apiDefinition from definition (const tuple
 * with path literals) so Zodios infers path and response types. All types
 * flow from schemas/definition.
 */
import {Zodios} from 'zodios';
import {API_BASE} from './endpoints';
import {apiDefinition, PATHS} from './definition';
import type {GifDeleteBody, GifDeleteResponse} from './schemas';

export const api = new Zodios(API_BASE, apiDefinition, {
  validateResponse: true,
  axiosConfig: {withCredentials: true},
});

export type Api = typeof api;

/** DELETE /api/gifs. Wrapper only because Zodios types delete body as patch. */
export function deleteGif(body: GifDeleteBody): Promise<GifDeleteResponse> {
  return api.delete(PATHS.gifs, body as never) as Promise<GifDeleteResponse>;
}
