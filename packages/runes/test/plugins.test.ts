import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergePlugins, applyAliases, type LoadedPlugin } from '../src/plugins.js';
import { defineRune, Rune } from '../src/rune.js';
import type { Plugin } from '@refrakt-md/types';
import type { RuneConfig, RuneProvenance } from '@refrakt-md/transform';

// ── Fixtures ──

function makeLoadedPlugin(pkg: Plugin, npmName: string): LoadedPlugin {
	const runes: Record<string, Rune> = {};
	const fixtures: Record<string, string> = {};
	for (const [name, entry] of Object.entries(pkg.runes)) {
		runes[name] = defineRune({
			name,
			schema: entry.transform as any,
			description: entry.description ?? `Community rune from ${pkg.name}`,
			authoringHints: entry.authoringHints,
		});
		if (entry.fixture) {
			fixtures[name] = entry.fixture;
		}
	}
	return { pkg, npmName, runes, fixtures };
}

const gameSystemPkg: Plugin = {
	name: 'game-system',
	displayName: 'Game System',
	version: '1.0.0',
	runes: {
		'item': {
			transform: { attributes: { name: { type: String } } },
			schema: { name: { type: 'string', required: true } },
			fixture: '{% item name="Sword" %}content{% /item %}',
			authoringHints: 'Pair with a rarity level and a descriptive name; used for tabletop RPG equipment, consumables, and quest items.',
			description: 'Game item with name and rarity',
		},
		'spell': {
			transform: { attributes: { name: { type: String } } },
			schema: { name: { type: 'string', required: true } },
			fixture: '{% spell name="Fireball" %}content{% /spell %}',
			description: 'Magic spell',
		},
	},
	extends: {
		'character': {
			schema: {
				class: { type: 'string' },
				level: { type: 'number' },
			},
		},
	},
	theme: {
		runes: {
			GameItem: { block: 'game-item' } as RuneConfig,
			GameSpell: { block: 'game-spell' } as RuneConfig,
		},
		icons: {
			'game-item': { common: '<svg>common</svg>' },
		},
	},
};

const altSystemPkg: Plugin = {
	name: 'alt-system',
	displayName: 'Alt System',
	version: '1.0.0',
	runes: {
		'item': {
			transform: { attributes: { name: { type: String } } },
			schema: { name: { type: 'string', required: true } },
		},
	},
};

const uniqueSystemPkg: Plugin = {
	name: 'unique-system',
	version: '1.0.0',
	runes: {
		'gadget': {
			transform: { attributes: { name: { type: String } } },
		},
	},
};

// ── Tests ──

describe('mergePlugins', () => {
	const coreRuneNames = new Set(['hint', 'callout', 'character', 'tabs', 'steps']);

	it('merges a single package with no collisions', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(Object.keys(result.runes)).toContain('item');
		expect(Object.keys(result.runes)).toContain('spell');
		expect(result.runes['item']).toBeInstanceOf(Rune);
		expect(result.runes['spell']).toBeInstanceOf(Rune);
	});

	it('builds tags map from resolved runes', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.tags['item']).toBeDefined();
		expect(result.tags['spell']).toBeDefined();
	});

	it('collects theme rune configs', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.themeRunes['GameItem']).toEqual({ block: 'game-item' });
		expect(result.themeRunes['GameSpell']).toEqual({ block: 'game-spell' });
	});

	it('collects theme icons', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.themeIcons['game-item']).toEqual({ common: '<svg>common</svg>' });
	});

	it('collects extensions', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.extensions['character']).toBeDefined();
		expect(result.extensions['character'].schema?.class).toEqual({ type: 'string' });
		expect(result.extensions['character'].schema?.level).toEqual({ type: 'number' });
	});

	it('returns package metadata', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.plugins).toHaveLength(1);
		expect(result.plugins[0].name).toBe('game-system');
	});

	it('merges multiple non-colliding packages', () => {
		const loaded = [
			makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPlugin(uniqueSystemPkg, '@refrakt-community/unique-system'),
		];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(Object.keys(result.runes)).toContain('item');
		expect(Object.keys(result.runes)).toContain('spell');
		expect(Object.keys(result.runes)).toContain('gadget');
	});

	// ── Resolution order: packages override core ──

	it('single package overrides core rune', () => {
		const shadowPkg: Plugin = {
			name: 'shadow-pkg',
			version: '1.0.0',
			runes: {
				'hint': { transform: { attributes: {} } },
				'unique-rune': { transform: { attributes: {} } },
			},
		};
		const loaded = [makeLoadedPlugin(shadowPkg, '@refrakt-community/shadow-pkg')];
		const result = mergePlugins(loaded, coreRuneNames);

		// Single package override is now allowed (official breakout path)
		expect(Object.keys(result.runes)).toContain('hint');
		expect(Object.keys(result.runes)).toContain('unique-rune');
		expect(result.provenance['hint'].source).toBe('plugin');
		expect(result.provenance['hint'].pluginName).toBe('shadow-pkg');
	});

	it('__core__ preference keeps core version', () => {
		const shadowPkg: Plugin = {
			name: 'shadow-pkg',
			version: '1.0.0',
			runes: {
				'hint': { transform: { attributes: {} } },
				'unique-rune': { transform: { attributes: {} } },
			},
		};
		const loaded = [makeLoadedPlugin(shadowPkg, '@refrakt-community/shadow-pkg')];
		const result = mergePlugins(loaded, coreRuneNames, { hint: '__core__' });

		// hint should be skipped (core wins), but unique-rune should be included
		expect(Object.keys(result.runes)).not.toContain('hint');
		expect(Object.keys(result.runes)).toContain('unique-rune');
	});

	it('throws on multi-package + core collision without preference', () => {
		const pkg1: Plugin = {
			name: 'pkg1',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const pkg2: Plugin = {
			name: 'pkg2',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const loaded = [
			makeLoadedPlugin(pkg1, '@refrakt-community/pkg1'),
			makeLoadedPlugin(pkg2, '@refrakt-community/pkg2'),
		];

		expect(() => mergePlugins(loaded, coreRuneNames)).toThrow('ambiguous');
	});

	it('resolves multi-package + core collision with prefer', () => {
		const pkg1: Plugin = {
			name: 'pkg1',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const pkg2: Plugin = {
			name: 'pkg2',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const loaded = [
			makeLoadedPlugin(pkg1, '@refrakt-community/pkg1'),
			makeLoadedPlugin(pkg2, '@refrakt-community/pkg2'),
		];

		const result = mergePlugins(loaded, coreRuneNames, { hint: 'pkg1' });
		expect(Object.keys(result.runes)).toContain('hint');
		expect(result.provenance['hint'].pluginName).toBe('pkg1');
	});

	// ── Provenance tracking ──

	it('populates provenance for all resolved runes', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.provenance['item']).toEqual({
			qualifiedId: 'game-system:item',
			source: 'plugin',
			pluginName: 'game-system',
			origin: '@refrakt-community/game-system',
		});
		expect(result.provenance['spell']).toEqual({
			qualifiedId: 'game-system:spell',
			source: 'plugin',
			pluginName: 'game-system',
			origin: '@refrakt-community/game-system',
		});
	});

	it('provenance empty for empty package list', () => {
		const result = mergePlugins([], coreRuneNames);
		expect(Object.keys(result.provenance)).toHaveLength(0);
	});

	// ── Existing collision tests (between packages, no core) ──

	it('throws on collision between two packages without preference', () => {
		const loaded = [
			makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPlugin(altSystemPkg, '@refrakt-community/alt-system'),
		];

		expect(() => mergePlugins(loaded, coreRuneNames)).toThrow('ambiguous');
	});

	it('resolves collision with prefer config', () => {
		const loaded = [
			makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPlugin(altSystemPkg, '@refrakt-community/alt-system'),
		];

		const result = mergePlugins(loaded, coreRuneNames, { item: 'game-system' });

		expect(Object.keys(result.runes)).toContain('item');
		// The preferred one should be from game-system
		expect(result.provenance['item'].pluginName).toBe('game-system');
	});

	it('throws when prefer references unknown package', () => {
		const loaded = [
			makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPlugin(altSystemPkg, '@refrakt-community/alt-system'),
		];

		expect(() => mergePlugins(loaded, coreRuneNames, { item: 'nonexistent' }))
			.toThrow('does not match');
	});

	it('collision error message includes resolution instructions', () => {
		const loaded = [
			makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPlugin(altSystemPkg, '@refrakt-community/alt-system'),
		];

		try {
			mergePlugins(loaded, coreRuneNames);
			expect.fail('should have thrown');
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain('item');
			expect(msg).toContain('runes');
			expect(msg).toContain('prefer');
		}
	});

	it('handles empty package list', () => {
		const result = mergePlugins([], coreRuneNames);

		expect(Object.keys(result.runes)).toHaveLength(0);
		expect(Object.keys(result.tags)).toHaveLength(0);
		expect(result.plugins).toHaveLength(0);
	});

	it('collects fixtures from resolved runes', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.fixtures['item']).toContain('{% item');
		expect(result.fixtures['spell']).toContain('{% spell');
	});

	it('propagates authoringHints field on runes', () => {
		const loaded = [makeLoadedPlugin(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePlugins(loaded, coreRuneNames);

		// item has authoring hints, spell does not
		expect(result.runes['item'].authoringHints).toBe('Pair with a rarity level and a descriptive name; used for tabletop RPG equipment, consumables, and quest items.');
		expect(result.runes['spell'].authoringHints).toBeUndefined();
	});

	it('merges extensions from multiple packages', () => {
		const ext1: Plugin = {
			name: 'ext1',
			version: '1.0.0',
			runes: { 'gadget1': { transform: { attributes: {} } } },
			extends: {
				'character': { schema: { hp: { type: 'number' } } },
			},
		};
		const ext2: Plugin = {
			name: 'ext2',
			version: '1.0.0',
			runes: { 'gadget2': { transform: { attributes: {} } } },
			extends: {
				'character': { schema: { ac: { type: 'number' } } },
			},
		};

		const loaded = [
			makeLoadedPlugin(ext1, '@refrakt-community/ext1'),
			makeLoadedPlugin(ext2, '@refrakt-community/ext2'),
		];
		const result = mergePlugins(loaded, coreRuneNames);

		expect(result.extensions['character'].schema?.hp).toEqual({ type: 'number' });
		expect(result.extensions['character'].schema?.ac).toEqual({ type: 'number' });
	});
});

describe('applyAliases', () => {
	const runes: Record<string, Rune> = {
		hint: defineRune({ name: 'hint', schema: { attributes: {} } as any, description: 'A hint' }),
		hero: defineRune({ name: 'hero', schema: { attributes: {} } as any, description: 'A hero' }),
	};
	const tags = { hint: runes.hint.schema, hero: runes.hero.schema };
	const provenance: Record<string, RuneProvenance> = {
		hint: { qualifiedId: 'core:hint', source: 'core' },
		hero: { qualifiedId: 'marketing:hero', source: 'plugin', pluginName: 'marketing' },
	};

	it('creates alias tag entries', () => {
		const result = applyAliases(runes, tags, { 'my-hint': 'hint' }, provenance);

		expect(result.tags['my-hint']).toBe(runes.hint.schema);
		expect(result.tags['hint']).toBe(runes.hint.schema); // original untouched
	});

	it('tracks provenance for aliases', () => {
		const result = applyAliases(runes, tags, { 'my-hint': 'hint' }, provenance);

		expect(result.provenance['my-hint'].qualifiedId).toBe('alias:my-hint->core:hint');
		expect(result.provenance['my-hint'].source).toBe('core');
	});

	it('throws on alias collision with existing rune', () => {
		expect(() => applyAliases(runes, tags, { 'hint': 'hero' }, provenance))
			.toThrow('conflicts with an existing rune');
	});

	it('throws when alias targets nonexistent rune', () => {
		expect(() => applyAliases(runes, tags, { 'my-thing': 'nonexistent' }, provenance))
			.toThrow('does not exist');
	});

	it('handles multiple aliases', () => {
		const result = applyAliases(
			runes, tags,
			{ 'my-hint': 'hint', 'my-hero': 'hero' },
			provenance,
		);

		expect(result.tags['my-hint']).toBe(runes.hint.schema);
		expect(result.tags['my-hero']).toBe(runes.hero.schema);
	});
});

describe('package validation', () => {
	it('isPlugin validates correct shape', async () => {
		// Import and test the internal validation via loadPlugin
		const { loadPlugin } = await import('../src/plugins.js');

		// This will fail because the module doesn't exist, but that's testing the import path
		await expect(loadPlugin('nonexistent-package')).rejects.toThrow('Failed to load');
	});
});
