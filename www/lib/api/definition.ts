import type {ZodTypeAny} from 'zod';
import {
  dashboardStatsSchema,
  gifDeleteBodySchema,
  gifDeleteResponseSchema,
  generateGifBodySchema,
  generateGifResponseSchema,
  gifRenameBodySchema,
  gifRenameResponseSchema,
  userResponseSchema,
} from './schemas';

export const PATHS = {
  stats: '/stats',
  gifs: '/gifs',
  gifsRename: '/gifs/rename',
  usersMe: '/users/me',
} as const;

/** Single source: Zodios-shaped endpoints + summary/tags for OpenAPI. Const tuple keeps path literals. */
export const apiDefinition = [
  {
    method: 'get' as const,
    path: PATHS.stats,
    response: dashboardStatsSchema,
    summary: 'Get dashboard stats and GIF list',
    tags: ['stats'] as const,
  },
  {
    method: 'post' as const,
    path: PATHS.gifs,
    parameters: [
      {name: 'body', type: 'Body' as const, schema: generateGifBodySchema},
    ],
    response: generateGifResponseSchema,
    summary: 'Create a GIF from selected slides',
    tags: ['gifs'] as const,
  },
  {
    method: 'delete' as const,
    path: PATHS.gifs,
    parameters: [
      {name: 'body', type: 'Body' as const, schema: gifDeleteBodySchema},
    ],
    response: gifDeleteResponseSchema,
    summary: 'Delete a GIF',
    tags: ['gifs'] as const,
  },
  {
    method: 'post' as const,
    path: PATHS.gifsRename,
    parameters: [
      {name: 'body', type: 'Body' as const, schema: gifRenameBodySchema},
    ],
    response: gifRenameResponseSchema,
    summary: 'Rename a GIF (update presentation title)',
    tags: ['gifs'] as const,
  },
  {
    method: 'get' as const,
    path: PATHS.usersMe,
    response: userResponseSchema,
    summary: 'Get current user / auth state',
    tags: ['users'] as const,
  },
] as const;

export type ApiRoutePath = (typeof apiDefinition)[number]['path'];

/** OpenAPI generator uses this; derived from apiDefinition so one source of truth */
export const apiRoutes = apiDefinition.map(ep => {
  const bodyParam =
    'parameters' in ep &&
    ep.parameters?.find((p: {type: string}) => p.type === 'Body');
  const requestBody =
    bodyParam && 'schema' in bodyParam
      ? (bodyParam.schema as ZodTypeAny)
      : undefined;
  return {
    method: ep.method,
    path: ep.path,
    summary: ep.summary,
    tags: [...ep.tags],
    requestBody,
    response: ep.response,
  };
});
