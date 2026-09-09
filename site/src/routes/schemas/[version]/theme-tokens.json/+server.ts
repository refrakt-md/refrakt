import {
	publishedSchemaVersions,
	readSchema,
	SCHEMA_HEADERS,
} from '$lib/schema-versions';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	publishedSchemaVersions().map((version) => ({ version }));

export const GET: RequestHandler = ({ params }) =>
	new Response(readSchema('theme-tokens.json', params.version), {
		headers: SCHEMA_HEADERS,
	});
