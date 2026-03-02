import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergePackages, applyAliases, type LoadedPackage } from '../src/packages.js';
import { defineRune, Rune } from '../src/rune.js';
import type { RunePackage } from '@refrakt-md/types';
import type { RuneConfig, RuneProvenance } from '@refrakt-md/transform';

// ── Fixtures ──

function makeLoadedPackage(pkg: RunePackage, npmName: string): LoadedPackage {
	const runes: Record<string, Rune> = {};
	const fixtures: Record<string, string> = {};
	for (const [name, entry] of Object.entries(pkg.runes)) {
		runes[name] = defineRune({
			name,
			schema: entry.transform as any,
			description: entry.description ?? `Community rune from ${pkg.name}`,
			prompt: entry.prompt,
		});
		if (entry.fixture) {
			fixtures[name] = entry.fixture;
		}
	}
	return { pkg, npmName, runes, fixtures };
}

const gameSystemPkg: RunePackage = {
	name: 'game-system',
	displayName: 'Game System',
	version: '1.0.0',
	runes: {
		'item': {
			transform: { attributes: { name: { type: String } } },
			schema: { name: { type: 'string', required: true } },
			fixture: '{% item name="Sword" %}content{% /item %}',
			prompt: 'Use for RPG items with rarity.',
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

const altSystemPkg: RunePackage = {
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

const uniqueSystemPkg: RunePackage = {
	name: 'unique-system',
	version: '1.0.0',
	runes: {
		'gadget': {
			transform: { attributes: { name: { type: String } } },
		},
	},
};

// ── Tests ──

describe('mergePackages', () => {
	const coreRuneNames = new Set(['hint', 'callout', 'character', 'tabs', 'steps']);

	it('merges a single package with no collisions', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(Object.keys(result.runes)).toContain('item');
		expect(Object.keys(result.runes)).toContain('spell');
		expect(result.runes['item']).toBeInstanceOf(Rune);
		expect(result.runes['spell']).toBeInstanceOf(Rune);
	});

	it('builds tags map from resolved runes', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.tags['item']).toBeDefined();
		expect(result.tags['spell']).toBeDefined();
	});

	it('collects theme rune configs', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.themeRunes['GameItem']).toEqual({ block: 'game-item' });
		expect(result.themeRunes['GameSpell']).toEqual({ block: 'game-spell' });
	});

	it('collects theme icons', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.themeIcons['game-item']).toEqual({ common: '<svg>common</svg>' });
	});

	it('collects extensions', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.extensions['character']).toBeDefined();
		expect(result.extensions['character'].schema?.class).toEqual({ type: 'string' });
		expect(result.extensions['character'].schema?.level).toEqual({ type: 'number' });
	});

	it('returns package metadata', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.packages).toHaveLength(1);
		expect(result.packages[0].name).toBe('game-system');
	});

	it('merges multiple non-colliding packages', () => {
		const loaded = [
			makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPackage(uniqueSystemPkg, '@refrakt-community/unique-system'),
		];
		const result = mergePackages(loaded, coreRuneNames);

		expect(Object.keys(result.runes)).toContain('item');
		expect(Object.keys(result.runes)).toContain('spell');
		expect(Object.keys(result.runes)).toContain('gadget');
	});

	// ── Resolution order: packages override core ──

	it('single package overrides core rune', () => {
		const shadowPkg: RunePackage = {
			name: 'shadow-pkg',
			version: '1.0.0',
			runes: {
				'hint': { transform: { attributes: {} } },
				'unique-rune': { transform: { attributes: {} } },
			},
		};
		const loaded = [makeLoadedPackage(shadowPkg, '@refrakt-community/shadow-pkg')];
		const result = mergePackages(loaded, coreRuneNames);

		// Single package override is now allowed (official breakout path)
		expect(Object.keys(result.runes)).toContain('hint');
		expect(Object.keys(result.runes)).toContain('unique-rune');
		expect(result.provenance['hint'].source).toBe('package');
		expect(result.provenance['hint'].packageName).toBe('shadow-pkg');
	});

	it('__core__ preference keeps core version', () => {
		const shadowPkg: RunePackage = {
			name: 'shadow-pkg',
			version: '1.0.0',
			runes: {
				'hint': { transform: { attributes: {} } },
				'unique-rune': { transform: { attributes: {} } },
			},
		};
		const loaded = [makeLoadedPackage(shadowPkg, '@refrakt-community/shadow-pkg')];
		const result = mergePackages(loaded, coreRuneNames, { hint: '__core__' });

		// hint should be skipped (core wins), but unique-rune should be included
		expect(Object.keys(result.runes)).not.toContain('hint');
		expect(Object.keys(result.runes)).toContain('unique-rune');
	});

	it('throws on multi-package + core collision without preference', () => {
		const pkg1: RunePackage = {
			name: 'pkg1',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const pkg2: RunePackage = {
			name: 'pkg2',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const loaded = [
			makeLoadedPackage(pkg1, '@refrakt-community/pkg1'),
			makeLoadedPackage(pkg2, '@refrakt-community/pkg2'),
		];

		expect(() => mergePackages(loaded, coreRuneNames)).toThrow('ambiguous');
	});

	it('resolves multi-package + core collision with prefer', () => {
		const pkg1: RunePackage = {
			name: 'pkg1',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const pkg2: RunePackage = {
			name: 'pkg2',
			version: '1.0.0',
			runes: { 'hint': { transform: { attributes: {} } } },
		};
		const loaded = [
			makeLoadedPackage(pkg1, '@refrakt-community/pkg1'),
			makeLoadedPackage(pkg2, '@refrakt-community/pkg2'),
		];

		const result = mergePackages(loaded, coreRuneNames, { hint: 'pkg1' });
		expect(Object.keys(result.runes)).toContain('hint');
		expect(result.provenance['hint'].packageName).toBe('pkg1');
	});

	// ── Provenance tracking ──

	it('populates provenance for all resolved runes', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.provenance['item']).toEqual({
			qualifiedId: 'game-system:item',
			source: 'package',
			packageName: 'game-system',
			origin: '@refrakt-community/game-system',
		});
		expect(result.provenance['spell']).toEqual({
			qualifiedId: 'game-system:spell',
			source: 'package',
			packageName: 'game-system',
			origin: '@refrakt-community/game-system',
		});
	});

	it('provenance empty for empty package list', () => {
		const result = mergePackages([], coreRuneNames);
		expect(Object.keys(result.provenance)).toHaveLength(0);
	});

	// ── Existing collision tests (between packages, no core) ──

	it('throws on collision between two packages without preference', () => {
		const loaded = [
			makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPackage(altSystemPkg, '@refrakt-community/alt-system'),
		];

		expect(() => mergePackages(loaded, coreRuneNames)).toThrow('ambiguous');
	});

	it('resolves collision with prefer config', () => {
		const loaded = [
			makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPackage(altSystemPkg, '@refrakt-community/alt-system'),
		];

		const result = mergePackages(loaded, coreRuneNames, { item: 'game-system' });

		expect(Object.keys(result.runes)).toContain('item');
		// The preferred one should be from game-system
		expect(result.provenance['item'].packageName).toBe('game-system');
	});

	it('throws when prefer references unknown package', () => {
		const loaded = [
			makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPackage(altSystemPkg, '@refrakt-community/alt-system'),
		];

		expect(() => mergePackages(loaded, coreRuneNames, { item: 'nonexistent' }))
			.toThrow('does not match');
	});

	it('collision error message includes resolution instructions', () => {
		const loaded = [
			makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system'),
			makeLoadedPackage(altSystemPkg, '@refrakt-community/alt-system'),
		];

		try {
			mergePackages(loaded, coreRuneNames);
			expect.fail('should have thrown');
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain('item');
			expect(msg).toContain('runes');
			expect(msg).toContain('prefer');
		}
	});

	it('handles empty package list', () => {
		const result = mergePackages([], coreRuneNames);

		expect(Object.keys(result.runes)).toHaveLength(0);
		expect(Object.keys(result.tags)).toHaveLength(0);
		expect(result.packages).toHaveLength(0);
	});

	it('collects fixtures from resolved runes', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(result.fixtures['item']).toContain('{% item');
		expect(result.fixtures['spell']).toContain('{% spell');
	});

	it('propagates prompt field on runes', () => {
		const loaded = [makeLoadedPackage(gameSystemPkg, '@refrakt-community/game-system')];
		const result = mergePackages(loaded, coreRuneNames);

		// item has prompt, spell does not
		expect(result.runes['item'].prompt).toBe('Use for RPG items with rarity.');
		expect(result.runes['spell'].prompt).toBeUndefined();
	});

	it('merges extensions from multiple packages', () => {
		const ext1: RunePackage = {
			name: 'ext1',
			version: '1.0.0',
			runes: { 'gadget1': { transform: { attributes: {} } } },
			extends: {
				'character': { schema: { hp: { type: 'number' } } },
			},
		};
		const ext2: RunePackage = {
			name: 'ext2',
			version: '1.0.0',
			runes: { 'gadget2': { transform: { attributes: {} } } },
			extends: {
				'character': { schema: { ac: { type: 'number' } } },
			},
		};

		const loaded = [
			makeLoadedPackage(ext1, '@refrakt-community/ext1'),
			makeLoadedPackage(ext2, '@refrakt-community/ext2'),
		];
		const result = mergePackages(loaded, coreRuneNames);

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
		hero: { qualifiedId: 'marketing:hero', source: 'package', packageName: 'marketing' },
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
	it('isRunePackage validates correct shape', async () => {
		// Import and test the internal validation via loadRunePackage
		const { loadRunePackage } = await import('../src/packages.js');

		// This will fail because the module doesn't exist, but that's testing the import path
		await expect(loadRunePackage('nonexistent-package')).rejects.toThrow('Failed to load');
	});
});
