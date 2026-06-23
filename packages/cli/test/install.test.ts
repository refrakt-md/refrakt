import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';
import {
	parsePackageName,
	resolveSource,
	readPackageJsonFromTarball,
	presetChromeKeys,
	validatePresetEntry,
	resolveTargetSite,
	setSiteTheme,
	appendSitePreset,
	createSite,
	listSiteKeys,
	validateCompat,
	validateThemeExports,
	detectFrameworkLayers,
} from '../src/commands/install.js';

describe('parsePackageName', () => {
	it('handles scoped and unscoped with version suffixes', () => {
		expect(parsePackageName('@refrakt-md/lumina')).toBe('@refrakt-md/lumina');
		expect(parsePackageName('@refrakt-md/lumina@1.2.3')).toBe('@refrakt-md/lumina');
		expect(parsePackageName('lumina')).toBe('lumina');
		expect(parsePackageName('lumina@^1.0.0')).toBe('lumina');
	});
});

/** Build a minimal npm-style .tgz containing package/package.json. */
function makeTarball(pkg: object): Buffer {
	const content = Buffer.from(JSON.stringify(pkg), 'utf-8');
	const header = Buffer.alloc(512);
	header.write('package/package.json', 0, 'utf-8');
	header.write('0000644\0', 100, 'utf-8'); // mode
	header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 'utf-8'); // size (octal)
	header.write('ustar\0', 257, 'utf-8');
	// checksum: fill with spaces, sum, write octal
	header.write('        ', 148, 'utf-8');
	let sum = 0;
	for (const b of header) sum += b;
	header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'utf-8');
	const contentBlock = Buffer.alloc(Math.ceil(content.length / 512) * 512);
	content.copy(contentBlock);
	const end = Buffer.alloc(1024); // two zero blocks
	return gzipSync(Buffer.concat([header, contentBlock, end]));
}

describe('readPackageJsonFromTarball / resolveSource', () => {
	it('reads name+version from a .tgz', () => {
		const dir = mkdtempSync(join(tmpdir(), 'rf-tgz-'));
		const tgz = join(dir, 'thing-1.2.3.tgz');
		writeFileSync(tgz, makeTarball({ name: '@acme/thing', version: '1.2.3' }));
		expect(readPackageJsonFromTarball(tgz)).toEqual({ name: '@acme/thing', version: '1.2.3' });
		const resolved = resolveSource(tgz);
		expect(resolved).toMatchObject({ name: '@acme/thing', version: '1.2.3', sourceType: 'tarball' });
	});

	it('reads a directory package.json', () => {
		const dir = mkdtempSync(join(tmpdir(), 'rf-dir-'));
		mkdirSync(join(dir, 'pkg'));
		writeFileSync(join(dir, 'pkg', 'package.json'), JSON.stringify({ name: '@acme/dir', version: '0.1.0' }));
		const resolved = resolveSource(join(dir, 'pkg'));
		expect(resolved).toMatchObject({ name: '@acme/dir', sourceType: 'directory' });
		expect(resolved.installSource.startsWith('file:')).toBe(true);
	});

	it('throws on a tarball with no package.json (no dead-end)', () => {
		const dir = mkdtempSync(join(tmpdir(), 'rf-bad-'));
		const tgz = join(dir, 'empty.tgz');
		writeFileSync(tgz, gzipSync(Buffer.alloc(1024))); // valid gzip, empty tar
		expect(() => resolveSource(tgz)).toThrow(/Could not read a package name/);
	});

	it('treats a non-existent path as a registry specifier', () => {
		expect(resolveSource('@refrakt-md/lumina@0.25.0')).toMatchObject({
			name: '@refrakt-md/lumina',
			sourceType: 'registry',
		});
	});
});

describe('multi-site selection', () => {
	const single: RefraktConfig = { site: { contentDir: 'site/content', theme: 'a' } } as RefraktConfig;
	const multi: RefraktConfig = { sites: { default: { contentDir: 'c', theme: 'a' }, blog: { contentDir: 'b', theme: 'a' } } } as RefraktConfig;

	it('infers the single site for existing-mode', () => {
		expect(resolveTargetSite(single, undefined, 'existing').key).toBe('default');
	});
	it('is ambiguous for multi-site without --site', () => {
		const r = resolveTargetSite(multi, undefined, 'existing');
		expect(r.key).toBeUndefined();
		expect(r.candidates).toEqual(['default', 'blog']);
	});
	it('selects a named existing site', () => {
		expect(resolveTargetSite(multi, 'blog', 'existing').key).toBe('blog');
	});
	it('rejects a new-site key that collides', () => {
		expect(resolveTargetSite(multi, 'blog', 'new').error).toMatch(/already exists/);
	});
	it('lists keys in both shapes', () => {
		expect(listSiteKeys(single)).toEqual(['default']);
		expect(listSiteKeys(multi)).toEqual(['default', 'blog']);
	});
});

describe('config mutation helpers', () => {
	it('sets a site theme preserving object form', () => {
		const raw: RefraktConfig = { site: { contentDir: 'c', theme: { package: 'old', presets: ['p'] } } } as RefraktConfig;
		const prev = setSiteTheme(raw, 'default', 'new');
		expect(prev).toBe('old');
		expect(raw.site!.theme).toEqual({ package: 'new', presets: ['p'] });
	});
	it('appends a preset, normalising a string theme', () => {
		const raw: RefraktConfig = { site: { contentDir: 'c', theme: 'pkg' } } as RefraktConfig;
		appendSitePreset(raw, 'default', '@acme/presets/ember');
		expect(raw.site!.theme).toEqual({ package: 'pkg', presets: ['@acme/presets/ember'] });
	});
	it('migrates singular → plural when adding a second site', () => {
		const raw: RefraktConfig = { site: { contentDir: 'c', theme: 'a' } } as RefraktConfig;
		createSite(raw, 'blog', { contentDir: 'b', theme: 'x' } as never);
		expect(raw.site).toBeUndefined();
		expect(Object.keys(raw.sites!)).toEqual(['default', 'blog']);
	});
});

describe('preset scope validation (SPEC-111 §2)', () => {
	it('finds chrome keys, ignoring syntax + color.code', () => {
		expect(presetChromeKeys({ syntax: { keyword: '#000' }, color: { code: { bg: '#111' } } })).toEqual([]);
		expect(presetChromeKeys({ color: { bg: '#fff', primary: '#abc' } }).sort()).toEqual(['color.bg', 'color.primary']);
		expect(presetChromeKeys({ modes: { dark: { color: { bg: '#000' } } } })).toEqual(['modes.dark.color.bg']);
	});
	it('warns when a declared syntax preset sets chrome', () => {
		const r = validatePresetEntry({ id: 'ember', scope: 'syntax', module: './e.json' }, { color: { bg: '#fff' } });
		expect(r.warnings.join(' ')).toMatch(/really a "palette" preset/);
	});
	it('passes a true syntax preset', () => {
		const r = validatePresetEntry({ id: 'ember', scope: 'syntax', module: './e.json' }, { syntax: { keyword: '#000' } });
		expect(r.warnings).toEqual([]);
		expect(r.errors).toEqual([]);
	});
	it('errors on an invalid scope and warns on malformed tunedFor', () => {
		const r = validatePresetEntry({ id: 'x', scope: 'bogus', tunedFor: 'nope' }, undefined);
		expect(r.errors.length).toBe(1);
		expect(r.warnings.length).toBe(1);
	});
});

describe('validation', () => {
	it('errors on an out-of-range refrakt, warns on malformed', () => {
		expect(validateCompat('>=0.25 <0.26', '0.24.0').errors.length).toBe(1);
		expect(validateCompat('>=banana', '0.25.0').warnings.length).toBe(1);
		expect(validateCompat(undefined, '0.25.0')).toEqual({ errors: [], warnings: [] });
	});
	it('framework-aware theme exports: ./transform required, ./svelte optional', () => {
		expect(validateThemeExports({ exports: { './transform': {} } })).toEqual([]);
		expect(validateThemeExports({ exports: {} }).length).toBe(1);
		expect(detectFrameworkLayers({ exports: { './transform': {}, './svelte': {} } })).toEqual(['svelte']);
		expect(detectFrameworkLayers({ exports: { './transform': {} } })).toEqual([]);
	});
});
