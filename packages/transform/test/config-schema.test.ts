import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import Ajv from 'ajv';
import { SITE_FIELDS } from '../src/config-normalize.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, '..', 'refrakt.config.schema.json'), 'utf-8'));
const typesSource = readFileSync(
	resolve(here, '..', '..', 'types', 'src', 'theme.ts'),
	'utf-8',
);

/**
 * Pull the declared property names off an interface in `@refrakt-md/types`.
 *
 * The schema is hand-maintained while the interfaces are the source of truth,
 * so this reads the real declarations rather than mirroring them in a literal —
 * a field added to `SiteConfig` fails here until the schema gains it too.
 * Only top-level members are collected (one tab of indentation); nested object
 * literals are described by the schema inline.
 */
function declaredProperties(interfaceName: string): string[] {
	const start = typesSource.indexOf(`export interface ${interfaceName} {`);
	if (start === -1) throw new Error(`interface ${interfaceName} not found in types/src/theme.ts`);
	const end = typesSource.indexOf('\n}', start);
	if (end === -1) throw new Error(`interface ${interfaceName} is unterminated`);

	return typesSource
		.slice(start, end)
		.split('\n')
		.map((line) => line.match(/^\t(?:'([^']+)'|([A-Za-z_$][\w$]*))\??\s*:/))
		.filter((m): m is RegExpMatchArray => m !== null)
		.map((m) => m[1] ?? m[2]);
}

/** Interface → the schema node that describes it. */
const COVERAGE: ReadonlyArray<[string, () => Record<string, unknown>]> = [
	['RefraktConfig', () => schema.properties],
	['SiteConfig', () => schema.definitions.SiteConfig.properties],
	['PlanConfig', () => schema.definitions.PlanConfig.properties],
	['RouteRule', () => schema.definitions.RouteRule.properties],
	['EntityRoute', () => schema.definitions.EntityRoute.properties],
	['XrefPattern', () => schema.definitions.XrefPattern.properties],
];

describe('refrakt.config.schema.json', () => {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate = ajv.compile(schema);

	describe('drift guard', () => {
		for (const [interfaceName, node] of COVERAGE) {
			it(`describes every ${interfaceName} field`, () => {
				const declared = declaredProperties(interfaceName);
				expect(declared.length).toBeGreaterThan(0);
				expect(Object.keys(node()).sort()).toEqual(
					expect.arrayContaining(declared.sort()),
				);
			});
		}

		it('declares no schema property the interfaces do not have', () => {
			// `$schema` is the JSON-Schema pointer itself, not a config field.
			const inSchema = Object.keys(schema.properties).filter((k) => k !== '$schema');
			expect(declaredProperties('RefraktConfig')).toEqual(
				expect.arrayContaining(inSchema),
			);
		});

		it('accepts every legacy shorthand at the top level', () => {
			// `SITE_FIELDS` is the set the normalizer mirrors site → top level and
			// `refrakt config migrate` moves top level → site. Both directions need
			// the flat shape to still validate.
			expect(Object.keys(schema.properties)).toEqual(
				expect.arrayContaining([...SITE_FIELDS]),
			);
		});

		it('only lists legacy shorthands that are real site fields', () => {
			expect(declaredProperties('SiteConfig')).toEqual(
				expect.arrayContaining([...SITE_FIELDS]),
			);
		});
	});

	describe('validation', () => {
		it('accepts a minimal singular-site config', () => {
			expect(validate({ site: { contentDir: './content', theme: '@refrakt-md/lumina' } })).toBe(true);
		});

		it('accepts entityRoutes, locale, and strings on a site', () => {
			const valid = validate({
				site: {
					contentDir: './content',
					theme: '@refrakt-md/lumina',
					entityRoutes: [
						{ type: 'spec', url: '/specs/{id}/', render: '{% expand $item.id /%}' },
						{ type: 'work', filter: 'status:ready', url: '/work/{id}/', 'render-template': 'templates:work.md' },
					],
					locale: 'de',
					strings: { 'core.toc.title': 'Inhalt', 'core.pagination.count': { one: '{n} Seite', other: '{n} Seiten' } },
				},
			});
			expect(ajv.errorsText(validate.errors)).toBe('No errors');
			expect(valid).toBe(true);
		});

		it('accepts project-level xrefs and fileRoots', () => {
			expect(
				validate({
					xrefs: [{ match: '^GH-(?<num>\\d+)$', template: 'https://github.com/o/r/issues/{num}', label: 'GitHub #{num}' }],
					fileRoots: { shared: './shared', templates: './templates' },
					site: { contentDir: './content', theme: '@refrakt-md/lumina' },
				}),
			).toBe(true);
		});

		it('accepts the current sandbox.dir as well as the deprecated examplesDir', () => {
			const base = { contentDir: './content', theme: '@refrakt-md/lumina' };
			expect(validate({ site: { ...base, sandbox: { dir: './sandbox' } } })).toBe(true);
			expect(validate({ site: { ...base, sandbox: { examplesDir: './examples' } } })).toBe(true);
		});

		it('accepts a routeRule that types a section as an entity', () => {
			expect(
				validate({
					site: {
						contentDir: './content',
						theme: '@refrakt-md/lumina',
						routeRules: [{ pattern: 'runes/**', layout: 'docs', entity: 'rune' }],
					},
				}),
			).toBe(true);
		});

		it('rejects declaring both site and sites', () => {
			expect(
				validate({
					site: { contentDir: './a', theme: 't' },
					sites: { main: { contentDir: './b', theme: 't' } },
				}),
			).toBe(false);
		});

		it('rejects an entityRoute with both render and render-template', () => {
			expect(
				validate({
					site: {
						contentDir: './content',
						theme: '@refrakt-md/lumina',
						entityRoutes: [{ type: 'spec', url: '/s/{id}/', render: 'x', 'render-template': 'y' }],
					},
				}),
			).toBe(false);
		});

		it('rejects an entityRoute missing its url', () => {
			expect(
				validate({
					site: {
						contentDir: './content',
						theme: '@refrakt-md/lumina',
						entityRoutes: [{ type: 'spec', render: 'x' }],
					},
				}),
			).toBe(false);
		});

		it('rejects an xref pattern missing its template', () => {
			expect(validate({ xrefs: [{ match: '^GH-\\d+$' }] })).toBe(false);
		});
	});
});
