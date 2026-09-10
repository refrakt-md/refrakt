import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	GROUPS,
	THEME_DEFAULTABLE,
	ARTIFACT_PATH,
	REGENERATE_COMMAND,
	readableType,
	resolveProperty,
	flatten,
	ungrouped,
	staleGroupEntries,
	render,
	readSchema,
} from './generate-config-reference.mjs';

/**
 * Same two-layer shape as `check-rune-docs.mjs`: unit tests over the pure
 * flattening, then live checks against the real schema and the committed
 * artifact.
 */
describe('readableType', () => {
	const schema = { definitions: { HighlightConfig: {} } };

	it('names the target of a $ref rather than saying "object"', () => {
		expect(readableType({ $ref: '#/definitions/HighlightConfig' }, schema)).toBe('HighlightConfig');
	});

	it('collapses oneOf into a union a reader recognises', () => {
		expect(readableType({
			oneOf: [{ type: 'string' }, { $ref: '#/definitions/SiteThemeConfig' }],
		}, schema)).toBe('string | SiteThemeConfig');
	});

	it('de-duplicates a union that collapses to one type', () => {
		expect(readableType({ oneOf: [{ type: 'string' }, { type: 'string' }] }, schema)).toBe('string');
	});

	it('renders arrays and records structurally', () => {
		expect(readableType({ type: 'array', items: { $ref: '#/definitions/RouteRule' } }, schema))
			.toBe('RouteRule[]');
		expect(readableType({ type: 'object', additionalProperties: { type: 'string' } }, schema))
			.toBe('Record<string, string>');
	});

	it('renders an enum as its literal values', () => {
		expect(readableType({ enum: ['auto', 'light'] }, schema)).toBe('"auto" | "light"');
	});
});

describe('resolveProperty', () => {
	const schema = {
		definitions: { RunesConfig: { description: 'Rune resolution.' } },
	};

	it('folds the sibling required array into a per-row flag', () => {
		expect(resolveProperty('contentDir', { type: 'string' }, schema, ['contentDir']).required).toBe(true);
		expect(resolveProperty('baseUrl', { type: 'string' }, schema, ['contentDir']).required).toBe(false);
	});

	it('inherits a $ref description from its target', () => {
		const row = resolveProperty('runes', { $ref: '#/definitions/RunesConfig' }, schema, []);
		expect(row.description).toBe('Rune resolution.');
	});

	it('carries default and deprecated through', () => {
		const row = resolveProperty('target', { type: 'string', deprecated: true, default: 'html' }, schema, []);
		expect(row.deprecated).toBe(true);
		expect(row.default).toBe('"html"');
	});

	it('marks the theme-defaultable fields', () => {
		expect(resolveProperty('baseUrl', { type: 'string' }, schema, []).themeDefaultable).toBe(true);
		expect(resolveProperty('contentDir', { type: 'string' }, schema, []).themeDefaultable).toBeUndefined();
	});
});

describe('the real schema', () => {
	const schema = readSchema();

	it('places every SiteConfig property in a group', () => {
		expect(ungrouped(schema)).toEqual([]);
	});

	it('has no group entry for a field the schema no longer declares', () => {
		expect(staleGroupEntries(schema)).toEqual([]);
	});

	it('uses every declared group', () => {
		const used = new Set(flatten(schema).map((f) => f.group));
		expect(GROUPS.map((g) => g.slug).filter((n) => !used.has(n))).toEqual([]);
	});

	it('leaves no field without a description', () => {
		expect(flatten(schema).filter((f) => !f.description).map((f) => f.name)).toEqual([]);
	});

	it('is deterministic — two renders are byte-identical', () => {
		expect(render(schema)).toBe(render(readSchema()));
	});

	/**
	 * The precedence this encodes (site config wins, theme manifest is the
	 * fallback) is stated in one place in the codebase. Tie the set to
	 * `ThemeManifest` so a field added to one and not the other is caught here
	 * rather than by a reader wondering why their theme's `baseUrl` is ignored.
	 *
	 * Deprecated fields are excluded. `target` is declared on both and is
	 * documentation-only on both — no adapter gates on it (ADR-024) — so there
	 * is no precedence to describe, and marking it "a theme can supply this"
	 * would imply an effect it does not have.
	 */
	it('marks exactly the live fields a ThemeManifest can also supply', () => {
		const source = readFileSync(
			new URL('../packages/types/src/theme.ts', import.meta.url),
			'utf8',
		);
		const start = source.indexOf('export interface ThemeManifest {');
		const body = source.slice(start, source.indexOf('\n}', start));
		const declared = [...body.matchAll(/^\t(?:'([^']+)'|([A-Za-z_$][\w$]*))\??\s*:/gm)]
			.map((m) => m[1] ?? m[2]);
		const siteProps = schema.definitions.SiteConfig.properties;
		const overlap = declared.filter((n) => siteProps[n] && !siteProps[n].deprecated);
		expect(overlap.sort()).toEqual([...THEME_DEFAULTABLE].sort());
	});
});

describe('the committed artifact', () => {
	it('is up to date', () => {
		const current = readFileSync(ARTIFACT_PATH, 'utf8');
		expect(
			current === render(readSchema()),
			`site/content/_data/config-fields.json is stale — run \`${REGENERATE_COMMAND}\``,
		).toBe(true);
	});
});
