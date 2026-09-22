import { describe, it, expect } from 'vitest';
import { validateThemeConfig, validateManifest } from '../src/validate.js';

describe('validateThemeConfig', () => {
	const validConfig = {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {
			hint: { note: '<svg>note</svg>', warning: '<svg>warn</svg>' },
		},
		runes: {
			Hint: {
				block: 'hint',
				modifiers: { hintType: { source: 'meta', default: 'note' } },
				// SPEC-125 — the structure below declares a `header` slot, so the
				// role has to be mapped or the section-role lint (correctly) fails
				// the config. Matches the real `Hint` entry in `baseConfig`.
				sections: { header: 'header' },
				structure: {
					header: {
						tag: 'div',
						before: true,
						children: [
							{ tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
							{ tag: 'span', ref: 'title', metaText: 'hintType' },
						],
					},
				},
			},
			Grid: { block: 'grid' },
		},
	};

	it('passes for a valid config', () => {
		const result = validateThemeConfig(validConfig);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('fails for non-object input', () => {
		const result = validateThemeConfig('not an object');
		expect(result.valid).toBe(false);
		expect(result.errors[0].message).toContain('non-null object');
	});

	it('fails when prefix is missing', () => {
		const result = validateThemeConfig({ ...validConfig, prefix: '' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'prefix')).toBe(true);
	});

	it('fails when tokenPrefix is missing', () => {
		const result = validateThemeConfig({ ...validConfig, tokenPrefix: undefined });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'tokenPrefix')).toBe(true);
	});

	it('fails when runes is missing', () => {
		const { runes, ...rest } = validConfig;
		const result = validateThemeConfig(rest);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'runes')).toBe(true);
	});

	it('fails when a rune has no block', () => {
		const result = validateThemeConfig({
			...validConfig,
			runes: { Bad: {} },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'runes.Bad.block')).toBe(true);
	});

	it('fails for invalid modifier source', () => {
		const result = validateThemeConfig({
			...validConfig,
			runes: {
				Bad: {
					block: 'bad',
					modifiers: { foo: { source: 'invalid' } },
				},
			},
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'runes.Bad.modifiers.foo.source')).toBe(true);
	});

	it('warns when icon group is referenced but not defined', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta' } },
					sections: { header: 'header' },
					structure: {
						header: {
							tag: 'div',
							children: [{ tag: 'span', icon: { group: 'hint', variant: 'hintType' } }],
						},
					},
				},
			},
		});
		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.message.includes('icon group "hint"'))).toBe(true);
	});

	it('warns when condition references non-existent modifier', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Test: {
					block: 'test',
					sections: { header: 'header' },
					structure: {
						header: {
							tag: 'div',
							children: [{ tag: 'span', condition: 'nonExistent' }],
						},
					},
				},
			},
		});
		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.message.includes('"nonExistent"'))).toBe(true);
	});

	it('validates contentWrapper requires tag and ref', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Test: {
					block: 'test',
					contentWrapper: { tag: '' },
				},
			},
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path.includes('contentWrapper.tag'))).toBe(true);
		expect(result.errors.some((e) => e.path.includes('contentWrapper.ref'))).toBe(true);
	});

	it('validates staticModifiers must be string array', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Test: { block: 'test', staticModifiers: [42] },
			},
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path.includes('staticModifiers'))).toBe(true);
	});

	it('validates styles entries', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Test: {
					block: 'test',
					styles: {
						good: '--my-prop',
						alsoGood: { prop: 'grid-template-columns', template: 'repeat({}, 1fr)' },
						bad: 42,
					},
				},
			},
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'runes.Test.styles.bad')).toBe(true);
	});

	it('validates contextModifiers values are strings', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Test: { block: 'test', contextModifiers: { Hero: 42 } },
			},
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path.includes('contextModifiers.Hero'))).toBe(true);
	});
});

describe('validateManifest', () => {
	// BUG-022 — this fixture used to be a pre-ADR-024 Svelte theme (`target`,
	// `layouts.*.component` pointing at .svelte files). That is what let the
	// validator drift: the suite stayed green while the check rejected both the
	// reference theme and every theme `create-refrakt` scaffolds.
	//
	// It is now the manifest `create-refrakt` actually emits
	// (`packages/create-refrakt/src/scaffold.ts`), so the check is measured
	// against the shape the project produces.
	const validManifest = {
		name: 'my-theme',
		version: '0.1.0',
		refrakt: '^0.36.0',
		designTokens: './tokens/base.css',
		layouts: {
			default: { regions: ['header', 'footer'] },
			docs: { regions: ['header', 'nav', 'sidebar', 'footer'] },
		},
		components: {},
		unsupportedRuneBehavior: 'passthrough',
	};

	it('passes for the manifest create-refrakt generates', () => {
		const result = validateManifest(validManifest);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	// The reference theme must pass its own project's validator. That it did not
	// is how BUG-022 was found.
	it("passes for Lumina's shipped manifest", async () => {
		const { readFileSync } = await import('node:fs');
		const { resolve } = await import('node:path');
		const manifest = JSON.parse(
			readFileSync(resolve(import.meta.dirname, '../../lumina/manifest.json'), 'utf-8'),
		);
		const result = validateManifest(manifest);
		expect(result.errors).toEqual([]);
		expect(result.valid).toBe(true);
	});

	// A framework theme still validates — ADR-024 made the framework layer
	// optional, not forbidden.
	it('passes for a framework theme that does declare target and components', () => {
		const result = validateManifest({
			...validManifest,
			target: 'svelte',
			layouts: {
				default: { component: './layouts/Default.svelte', regions: ['content'] },
			},
			components: { Chart: { component: './components/Chart.svelte' } },
			routeRules: [{ pattern: '**', layout: 'default' }],
		});
		expect(result.valid).toBe(true);
	});

	it('fails for non-object input', () => {
		const result = validateManifest(null);
		expect(result.valid).toBe(false);
	});

	it('fails when the identifying fields are missing', () => {
		const result = validateManifest({});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'name')).toBe(true);
		expect(result.errors.some((e) => e.path === 'version')).toBe(true);
	});

	// ADR-024 deprecated `target`; `designTokens` and `layouts.*.component` are
	// read by no runtime code. None of the three is a requirement.
	it.each(['target', 'designTokens'])('does not require %s', (field) => {
		const result = validateManifest({ name: 'x', version: '1.0.0' });
		expect(result.errors.some((e) => e.path === field)).toBe(false);
	});

	it('does not require layouts.*.component', () => {
		const result = validateManifest({
			name: 'x',
			version: '1.0.0',
			layouts: { docs: { regions: ['content'] } },
		});
		expect(result.valid).toBe(true);
	});

	// Optional does not mean unchecked — a typo in a field that IS present is
	// still an error.
	it.each([
		['target', ''],
		['designTokens', 42],
	])('still rejects a malformed %s when present', (field, value) => {
		const result = validateManifest({ name: 'x', version: '1.0.0', [field]: value });
		expect(result.errors.some((e) => e.path === field)).toBe(true);
	});

	it('still rejects a malformed layouts.*.component when present', () => {
		const result = validateManifest({
			name: 'x',
			version: '1.0.0',
			layouts: { bad: { component: 42, regions: ['content'] } },
		});
		expect(result.errors.some((e) => e.path === 'layouts.bad.component')).toBe(true);
	});

	it('still requires layout regions', () => {
		const result = validateManifest({
			...validManifest,
			layouts: { bad: { regions: 'not-array' } },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'layouts.bad.regions')).toBe(true);
	});

	it('passes for a manifest without routeRules (now optional)', () => {
		const result = validateManifest(validManifest);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('validates routeRules entries have pattern and layout', () => {
		const result = validateManifest({
			...validManifest,
			routeRules: [{}],
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'routeRules[0].pattern')).toBe(true);
		expect(result.errors.some((e) => e.path === 'routeRules[0].layout')).toBe(true);
	});

	it('warns when routeRule references non-existent layout', () => {
		const result = validateManifest({
			...validManifest,
			routeRules: [{ pattern: '**', layout: 'nonexistent' }],
		});
		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.message.includes('"nonexistent"'))).toBe(true);
	});

	it('validates component entries have component field', () => {
		const result = validateManifest({
			...validManifest,
			components: { Bad: {} },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === 'components.Bad.component')).toBe(true);
	});
});
