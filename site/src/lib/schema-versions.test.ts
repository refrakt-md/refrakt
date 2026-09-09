import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
	currentSchemaVersion,
	currentVersion,
	publishedSchemaVersions,
	readSchema,
} from './schema-versions.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');

function packageVersion(pkg: string): string {
	return JSON.parse(readFileSync(resolve(root, 'packages', pkg, 'package.json'), 'utf-8')).version;
}

describe('schema version enumeration', () => {
	it('tracks the version @refrakt-md/transform ships', () => {
		const [major, minor] = packageVersion('transform').split('.').map(Number);
		expect(currentVersion()).toEqual([major, minor]);
		expect(currentSchemaVersion()).toBe(`v${major}.${minor}`);
	});

	it('serves every version from the first versioned release through the current one', () => {
		const versions = publishedSchemaVersions();
		// v0.11 published the first versioned URL (WORK-176); nothing earlier existed.
		expect(versions[0]).toBe('v0.11');
		expect(versions.at(-1)).toBe(currentSchemaVersion());
		expect(new Set(versions).size).toBe(versions.length);
	});

	it('covers the URL create-refrakt bakes into scaffolded projects', () => {
		// BUG-004: create-refrakt derives `$schema` from its own version, so the
		// route set has to include it or every new project points at a 404.
		// create-refrakt is versioned in lockstep with the rest of the monorepo.
		const [major, minor] = packageVersion('create-refrakt').split('.').map(Number);
		expect(publishedSchemaVersions()).toContain(`v${major}.${minor}`);
	});

	it('leaves no gap in the served range', () => {
		const minors = publishedSchemaVersions()
			.filter((v) => v.startsWith('v0.'))
			.map((v) => Number(v.slice('v0.'.length)));
		for (let i = 1; i < minors.length; i++) {
			expect(minors[i]).toBe(minors[i - 1] + 1);
		}
	});
});

describe('readSchema', () => {
	it('stamps the versioned $id onto a versioned copy', () => {
		const body = JSON.parse(readSchema('refrakt.config.schema.json', 'v0.11'));
		expect(body.$id).toBe('https://refrakt.md/schemas/v0.11/refrakt.config.schema.json');
	});

	it('stamps the current release onto the unversioned alias', () => {
		const body = JSON.parse(readSchema('theme-tokens.json', null));
		expect(body.$id).toBe(
			`https://refrakt.md/schemas/${currentSchemaVersion()}/theme-tokens.json`,
		);
	});

	it('changes nothing but the $id', () => {
		const source = JSON.parse(
			readFileSync(resolve(root, 'packages', 'transform', 'refrakt.config.schema.json'), 'utf-8'),
		);
		const served = JSON.parse(readSchema('refrakt.config.schema.json', 'v0.11'));
		delete source.$id;
		delete served.$id;
		expect(served).toEqual(source);
	});

	it('serves the theme-tokens schema from its differently-named source file', () => {
		// The URL is `theme-tokens.json`; the file on disk is `theme-tokens.schema.json`.
		const body = JSON.parse(readSchema('theme-tokens.json', 'v0.25'));
		expect(body.title).toBe('refrakt ThemeTokensConfig');
	});

	it('emits valid JSON with a trailing newline', () => {
		const raw = readSchema('refrakt.config.schema.json', 'v0.31');
		expect(raw.endsWith('\n')).toBe(true);
		expect(() => JSON.parse(raw)).not.toThrow();
	});
});
