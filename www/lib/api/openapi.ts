/**
 * OpenAPI 3.0 spec generation from the same route definitions used by the Zodios client.
 * Run via: npm run openapi
 */
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import {apiRoutes} from './definition';

const registry = new OpenAPIRegistry();

apiRoutes.forEach(route => {
  registry.registerPath({
    method: route.method,
    path: route.path,
    summary: route.summary,
    tags: route.tags,
    request: route.requestBody
      ? {
          body: {
            content: {
              'application/json': {schema: route.requestBody},
            },
          },
        }
      : undefined,
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {schema: route.response},
        },
      },
    },
  });
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export function generateOpenAPIDocument() {
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Slides2Gif API',
      version: '1.0.0',
      description: 'API for creating GIFs from Google Slides',
    },
    servers: [{url: '/api', description: 'Same-origin API'}],
  });
}
