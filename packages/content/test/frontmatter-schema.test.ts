import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
	readFileSync(resolve(here, '..', 'frontmatter.schema.json'), 'utf-8'),
);
const typesSource = readFileSync(resolve(here, '..', 'src', 'frontmatter.ts'), 'utf-8');

/**
 * Pull the declared members off the `Frontmatter` interface.
 *
 * Reads the real declarations rather than mirroring them in a literal, the same
 * approach `config-schema.test.ts` takes — which is what caught two config
 * discrepancies nobody had spotted by hand. Only top-level members at one tab
 * of indentation are collected; the index signature is skipped by the pattern,
 * since it is not a named field.
 */
function declaredProperties(): string[] {
	const start = typesSource.indexOf('export interface Frontmatter {');
	if (start === -1) throw new Error('interface Frontmatter not found in content/src/frontmatter.ts');
	const end = typesSource.indexOf('\n}', start);
	if (end === -1) throw new Error('interface Frontmatter is unterminated');
	return typesSource
		.slice(start, end)
		.split('\n')
		.map((line) => line.match(/^ {2}(?:'([^']+)'|([A-Za-z_$][\w$]*))\??\s*:/))
		.filter((m): m is RegExpMatchArray => m !== null)
		.map((m) => m[1] ?? m[2]);
}

describe('frontmatter.schema.json', () => {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate = ajv.compile(schema);

	describe('drift guard', () => {
		it('describes every declared Frontmatter field', () => {
			const declared = declaredProperties();
			expect(declared.length).toBeGreaterThan(0);
			expect(Object.keys(schema.properties).sort()).toEqual(
				expect.arrayContaining(declared.sort()),
			);
		});

		it('declares no property the interface does not have', () => {
			expect(declaredProperties()).toEqual(
				expect.arrayContaining(Object.keys(schema.properties)),
			);
		});

		it('gives every property a description', () => {
			const undescribed = Object.entries(schema.properties)
				.filter(([, prop]) => {
					const p = prop as Record<string, unknown>;
					return typeof p.description !== 'string' || p.description.trim() === '';
				})
				.map(([name]) => name);
			expect(undescribed).toEqual([]);
		});

		/**
		 * `type`, `id`, `created` and `modified` are read by `page-entities.ts`
		 * and `timestamps.ts`. They used to reach those consumers through the
		 * index signature — undeclared *and* undocumented (WORK-545). `type` is
		 * the field that drives the whole entity registry, so its absence was the
		 * most consequential.
		 */
		it('declares the fields that were only reachable through the index signature', () => {
			for (const name of ['type', 'id', 'created', 'modified']) {
				expect(declaredProperties(), `${name} should be declared`).toContain(name);
				expect(schema.properties[name], `${name} should be in the schema`).toBeDefined();
			}
		});
	});

	describe('validation', () => {
		it('accepts a typical page', () => {
			expect(validate({
				title: 'Surfaces',
				description: 'The surface model on one page',
				tags: ['runes', 'theme'],
				type: 'rune',
			})).toBe(true);
		});

		/**
		 * The open set is a feature, not an oversight: runes and pipeline hooks
		 * read author fields refrakt knows nothing about, so the schema must not
		 * set `additionalProperties: false`.
		 */
		it('accepts arbitrary author fields', () => {
			expect(validate({ title: 'X', category: 'Registry', plugin: 'core' })).toBe(true);
		});

		it('accepts an explicit null tint, which resets the cascade', () => {
			expect(validate({ tint: null })).toBe(true);
		});

		it('rejects a tint-mode outside the allowed set', () => {
			expect(validate({ 'tint-mode': 'sepia' })).toBe(false);
		});

		it('rejects a wrongly typed field', () => {
			expect(validate({ draft: 'yes' })).toBe(false);
			expect(validate({ tags: 'runes' })).toBe(false);
		});
	});
});
