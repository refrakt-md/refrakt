import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const prerender = true;

const SCHEMA_PATH = resolve('..', 'packages', 'transform', 'refrakt.config.schema.json');

export function GET(): Response {
	const body = readFileSync(SCHEMA_PATH, 'utf-8');
	return new Response(body, {
		headers: {
			'Content-Type': 'application/schema+json; charset=utf-8',
		},
	});
}
