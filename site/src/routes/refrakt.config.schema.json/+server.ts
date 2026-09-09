/** Unversioned "latest" alias for the refrakt.config.json schema — always
 *  serves the most recently published schema. Pinned projects use the
 *  versioned URL under `/schemas/v{major}.{minor}/` instead. */
import { readSchema, SCHEMA_HEADERS } from '$lib/schema-versions';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () =>
	new Response(readSchema('refrakt.config.schema.json', null), { headers: SCHEMA_HEADERS });
