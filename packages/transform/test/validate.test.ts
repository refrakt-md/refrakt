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
		expect(result.errors.some(e => e.path === 'prefix')).toBe(true);
	});

	it('fails when tokenPrefix is missing', () => {
		const result = validateThemeConfig({ ...validConfig, tokenPrefix: undefined });
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'tokenPrefix')).toBe(true);
	});

	it('fails when runes is missing', () => {
		const { runes, ...rest } = validConfig;
		const result = validateThemeConfig(rest);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'runes')).toBe(true);
	});

	it('fails when a rune has no block', () => {
		const result = validateThemeConfig({
			...validConfig,
			runes: { Bad: { } },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'runes.Bad.block')).toBe(true);
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
		expect(result.errors.some(e => e.path === 'runes.Bad.modifiers.foo.source')).toBe(true);
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
					structure: {
						header: {
							tag: 'div',
							children: [
								{ tag: 'span', icon: { group: 'hint', variant: 'hintType' } },
							],
						},
					},
				},
			},
		});
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.message.includes('icon group "hint"'))).toBe(true);
	});

	it('warns when condition references non-existent modifier', () => {
		const result = validateThemeConfig({
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Test: {
					block: 'test',
					structure: {
						header: {
							tag: 'div',
							children: [
								{ tag: 'span', condition: 'nonExistent' },
							],
						},
					},
				},
			},
		});
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.message.includes('"nonExistent"'))).toBe(true);
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
		expect(result.errors.some(e => e.path.includes('contentWrapper.tag'))).toBe(true);
		expect(result.errors.some(e => e.path.includes('contentWrapper.ref'))).toBe(true);
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
		expect(result.errors.some(e => e.path.includes('staticModifiers'))).toBe(true);
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
		expect(result.errors.some(e => e.path === 'runes.Test.styles.bad')).toBe(true);
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
		expect(result.errors.some(e => e.path.includes('contextModifiers.Hero'))).toBe(true);
	});
});

describe('validateManifest', () => {
	const validManifest = {
		name: 'my-theme',
		version: '0.1.0',
		target: 'svelte',
		designTokens: './tokens/base.css',
		layouts: {
			default: { component: './layouts/Default.svelte', regions: ['content'] },
			docs: { component: './layouts/Docs.svelte', regions: ['content', 'sidebar'] },
		},
		routeRules: [
			{ pattern: 'docs/**', layout: 'docs' },
			{ pattern: '**', layout: 'default' },
		],
		components: {
			Chart: { component: './components/Chart.svelte' },
		},
	};

	it('passes for a valid manifest', () => {
		const result = validateManifest(validManifest);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('fails for non-object input', () => {
		const result = validateManifest(null);
		expect(result.valid).toBe(false);
	});

	it('fails when required string fields are missing', () => {
		const result = validateManifest({});
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'name')).toBe(true);
		expect(result.errors.some(e => e.path === 'version')).toBe(true);
		expect(result.errors.some(e => e.path === 'target')).toBe(true);
		expect(result.errors.some(e => e.path === 'designTokens')).toBe(true);
	});

	it('validates layout entries have component and regions', () => {
		const result = validateManifest({
			...validManifest,
			layouts: { bad: { regions: 'not-array' } },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'layouts.bad.component')).toBe(true);
		expect(result.errors.some(e => e.path === 'layouts.bad.regions')).toBe(true);
	});

	it('validates routeRules entries have pattern and layout', () => {
		const result = validateManifest({
			...validManifest,
			routeRules: [{}],
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'routeRules[0].pattern')).toBe(true);
		expect(result.errors.some(e => e.path === 'routeRules[0].layout')).toBe(true);
	});

	it('warns when routeRule references non-existent layout', () => {
		const result = validateManifest({
			...validManifest,
			routeRules: [{ pattern: '**', layout: 'nonexistent' }],
		});
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.message.includes('"nonexistent"'))).toBe(true);
	});

	it('validates component entries have component field', () => {
		const result = validateManifest({
			...validManifest,
			components: { Bad: {} },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.path === 'components.Bad.component')).toBe(true);
	});
});
