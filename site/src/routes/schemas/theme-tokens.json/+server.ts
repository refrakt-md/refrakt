/** Unversioned "latest" alias for the theme-tokens schema. This is the URL the
 *  schema's own `$id` has always declared, so it needs to resolve. */
import { readSchema, SCHEMA_HEADERS } from '$lib/schema-versions';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () =>
	new Response(readSchema('theme-tokens.json', null), { headers: SCHEMA_HEADERS });
