/**
 * Generate OpenAPI 3.0 spec from lib/api definition.
 * Output: openapi.json in www/.
 *
 * Run: npm run openapi   (from www/)
 * Then run npm run openapi:types to refresh lib/api/generated/openapi.d.ts for the fetch client.
 */
import {writeFileSync} from 'fs';
import {resolve} from 'path';
import {generateOpenAPIDocument} from '../lib/api/openapi';

const outDir = resolve(__dirname, '..');
const doc = generateOpenAPIDocument();

writeFileSync(
  resolve(outDir, 'openapi.json'),
  JSON.stringify(doc, null, 2),
  'utf-8'
);
console.log('Wrote openapi.json');
