/** Unversioned "latest" alias for the frontmatter schema, matching the shape the
 *  other two published schemas use. */
import { readSchema, SCHEMA_HEADERS } from '$lib/schema-versions';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () =>
	new Response(readSchema('frontmatter.schema.json', null), { headers: SCHEMA_HEADERS });
