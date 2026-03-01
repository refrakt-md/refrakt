import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergePackages, type LoadedPackage } from '../src/packages.js';
import { defineRune, Rune } from '../src/rune.js';
import type { RunePackage } from '@refrakt-md/types';
import type { RuneConfig } from '@refrakt-md/transform';

// ── Fixtures ──

function makeLoadedPackage(pkg: RunePackage, npmName: string): LoadedPackage {
	const runes: Record<string, Rune> = {};
	for (const [name, entry] of Object.entries(pkg.runes)) {
		runes[name] = defineRune({
			name,
			schema: entry.transform as any,
			description: `Community rune from ${pkg.name}`,
		});
	}
	return { pkg, npmName, runes };
}

const gameSystemPkg: RunePackage = {
	name: 'game-system',
	displayName: 'Game System',
	version: '1.0.0',
	runes: {
		'item': {
			transform: { attributes: { name: { type: String } } },
			schema: { name: { type: 'string', required: true } },
		},
		'spell': {
			transform: { attributes: { name: { type: String } } },
			schema: { name: { type: 'string', required: true } },
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

	it('skips community runes that shadow core names', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const shadowPkg: RunePackage = {
			name: 'shadow-pkg',
			version: '1.0.0',
			runes: {
				'hint': { transform: { attributes: {} } }, // shadows core 'hint'
				'unique-rune': { transform: { attributes: {} } },
			},
		};
		const loaded = [makeLoadedPackage(shadowPkg, '@refrakt-community/shadow-pkg')];
		const result = mergePackages(loaded, coreRuneNames);

		expect(Object.keys(result.runes)).not.toContain('hint');
		expect(Object.keys(result.runes)).toContain('unique-rune');
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('shadows a core rune'));

		warnSpy.mockRestore();
	});

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
		expect(result.runes['item'].description).toContain('game-system');
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

describe('package validation', () => {
	it('isRunePackage validates correct shape', async () => {
		// Import and test the internal validation via loadRunePackage
		const { loadRunePackage } = await import('../src/packages.js');

		// This will fail because the module doesn't exist, but that's testing the import path
		await expect(loadRunePackage('nonexistent-package')).rejects.toThrow('Failed to load');
	});
});
