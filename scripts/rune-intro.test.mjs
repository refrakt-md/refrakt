import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	INTRO_PATH,
	buildIntro,
	frontmatterOf,
	introRecords,
	renderIntro,
	sourceOf,
} from './rune-intro.mjs';
import { readSites } from './generate-rune-attributes.mjs';
import { findDocPages } from './check-rune-docs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** SPEC-187 D5 — the intro data, from synthetic runes and from the repository. */

const pages = new Map([
	['hint', { rel: 'hint.md', isRune: true }],
	['howto', { rel: 'learning/howto.md', isRune: true }],
	['hero', { rel: 'marketing/hero.md', isRune: true }],
	['tab', { rel: 'tabs.md', isRune: true }],
]);
const frontmatter = {
	'hint.md': '---\ntitle: Hint\ndescription: Callouts\nstatus: stable\ntype: rune\n---\n',
	'learning/howto.md': '---\ntitle: HowTo\ndescription: Steps\nstatus: beta\ntype: rune\n---\n',
	'marketing/hero.md': '---\ntitle: Hero\ndescription: "Intro bands"\ntype: rune\n---\n',
	'tabs.md': '---\ntitle: Tabs\ntype: rune\n---\n',
};
const files = new Set([
	'packages/runes/src/tags/hint.ts',
	'plugins/learning/src/tags/howto.ts',
	'plugins/marketing/runes/hero.md',
]);
const ctx = {
	pages,
	read: (rel) => frontmatter[rel],
	dirs: {
		core: 'packages/runes',
		'@refrakt-md/learning': 'plugins/learning',
		'@refrakt-md/marketing': 'plugins/marketing',
	},
	runeDirOf: { '@refrakt-md/marketing': 'runes' },
	exists: (p) => files.has(p),
};
const runes = [
	{ name: 'hero', plugin: '@refrakt-md/marketing' },
	{ name: 'howto', plugin: '@refrakt-md/learning', schemaOrg: { type: 'HowTo' } },
	{ name: 'hint', plugin: 'core' },
	// A child rune is documented on its parent's page and gets no intro.
	{ name: 'tab', plugin: 'core' },
];

describe('the rune intro records (WORK-705)', () => {
	const records = introRecords(runes, ctx);
	const by = Object.fromEntries(records.map((r) => [r.rune, r]));

	it('has one record per rune with a page of its own, sorted', () => {
		expect(records.map((r) => r.rune)).toEqual(['hero', 'hint', 'howto']);
	});

	it('reads title, description and status from the page, defaulting status to stable', () => {
		expect(by.hero).toMatchObject({ title: 'Hero', description: 'Intro bands', status: 'stable' });
		expect(by.howto).toMatchObject({ status: 'beta', unstable: true });
		expect(by.hint.unstable).toBe(false);
	});

	it('a core rune: Core, its schema module, nothing published', () => {
		expect(by.hint).toMatchObject({
			package: 'core',
			packageLabel: 'Core',
			plugin: false,
			composed: false,
			source: 'packages/runes/src/tags/hint.ts',
			publishes: false,
			schemaType: '',
			schemaUrl: '',
		});
	});

	it('a native plugin rune: its package, its schema module, its default schema.org type', () => {
		expect(by.howto).toMatchObject({
			package: '@refrakt-md/learning',
			packageUrl: '/runes/learning',
			plugin: true,
			composed: false,
			source: 'plugins/learning/src/tags/howto.ts',
			publishes: true,
			schemaType: 'HowTo',
			schemaUrl: 'https://schema.org/HowTo',
		});
	});

	it('a composed rune: the definition in its plugin’s runeDir', () => {
		expect(by.hero).toMatchObject({
			composed: true,
			source: 'plugins/marketing/runes/hero.md',
			packageUrl: '/runes/marketing',
		});
	});

	it('carries no install field: the partial builds it from the package (D8)', () => {
		for (const r of records) expect(r).not.toHaveProperty('install');
	});

	it('fails on a rune whose source names no file, rather than linking nowhere', () => {
		expect(() => sourceOf({ name: 'ghost', plugin: 'core' }, ctx)).toThrow(/no source for "ghost"/);
	});

	it('reads quoted and bare frontmatter values', () => {
		expect(frontmatterOf('---\ntitle: "A: B"\nstatus: beta\n---\nbody')).toEqual({
			title: 'A: B',
			status: 'beta',
		});
	});
});

describe('the committed intro data (live)', () => {
	const { runes: records } = JSON.parse(readFileSync(INTRO_PATH, 'utf8'));
	const by = Object.fromEntries(records.map((r) => [r.rune, r]));

	it('covers every rune reference page', () => {
		const runePages = [...findDocPages().entries()].filter(([, p]) => p.isRune).map(([n]) => n);
		expect(records.map((r) => r.rune).sort()).toEqual(runePages.sort());
	});

	it('names a source file that exists for every record', () => {
		for (const r of records) expect(existsSync(join(ROOT, r.source)), r.rune).toBe(true);
	});

	it('matches what the runes and pages produce today', async () => {
		const seen = new Map();
		for (const { runes } of readSites())
			for (const r of runes) if (!seen.has(r.name)) seen.set(r.name, r);
		const fresh = renderIntro(await buildIntro([...seen.values()]));
		expect(readFileSync(INTRO_PATH, 'utf8'), 'run `npm run runes:attributes`').toBe(fresh);
	}, 60000);

	it('marks the live compositions, and only them', () => {
		expect(records.filter((r) => r.composed).map((r) => r.rune)).toEqual([
			'cta',
			'hero',
			'testimonial',
		]);
		expect(by.testimonial.schemaType).toBe('Review');
		expect(by.hint).toMatchObject({ packageLabel: 'Core', composed: false });
	});
});
