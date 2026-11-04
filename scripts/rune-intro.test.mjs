import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	INTRO_PATH,
	frontmatterOf,
	introRecords,
	renderIntro,
	stagedRecords,
	withBadges,
	sourceOf,
} from './rune-intro.mjs';
import { buildIntroBySite, readSites } from './generate-rune-attributes.mjs';
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
	repo: { url: 'https://github.com/acme/site/', branch: 'trunk' },
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
			packageLabel: 'core',
			plugin: false,
			core: true,
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
			packageLabel: 'learning',
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
			sourceUrl: 'https://github.com/acme/site/blob/trunk/plugins/marketing/runes/hero.md',
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

describe('the staged state (D7)', () => {
	const main = [
		{
			rune: 'steps',
			composed: false,
			staged: false,
			source: 'plugins/m/src/tags/steps.ts',
			package: '@x/m',
		},
		{
			rune: 'hero',
			composed: true,
			staged: false,
			source: 'plugins/m/runes/hero.md',
			package: '@x/m',
		},
	];
	const repo = { url: 'https://github.com/acme/site', branch: 'main' };

	it('marks a rune the site resolves from its project rune directory as staged', () => {
		const out = stagedRecords(main, {
			runes: [
				{ name: 'steps', plugin: 'project' },
				{ name: 'hero', plugin: '@x/m' },
			],
			runesDir: 'site/staged-runes',
			repo,
		});
		expect(out[0]).toMatchObject({
			composed: true,
			staged: true,
			package: '@x/m',
			source: 'site/staged-runes/steps.md',
			sourceUrl: 'https://github.com/acme/site/blob/main/site/staged-runes/steps.md',
		});
		expect(out[1]).toBe(main[1]);
	});

	it('shows Composition only for a composed rune that is not staged', () => {
		expect(withBadges({ composed: true, staged: false }).compositionBadge).toBe(true);
		expect(withBadges({ composed: true, staged: true }).compositionBadge).toBe(false);
		expect(withBadges({ composed: false, staged: false }).compositionBadge).toBe(false);
	});
});

describe('the committed intro data (live)', () => {
	const artifact = JSON.parse(readFileSync(INTRO_PATH, 'utf8'));
	const records = artifact.main;
	const by = Object.fromEntries(records.map((r) => [r.rune, r]));

	it('covers every rune reference page', () => {
		const runePages = [...findDocPages().entries()].filter(([, p]) => p.isRune).map(([n]) => n);
		expect(records.map((r) => r.rune).sort()).toEqual(runePages.sort());
	});

	it('names a source file that exists for every record', () => {
		for (const r of records) expect(existsSync(join(ROOT, r.source)), r.rune).toBe(true);
	});

	it('matches what the runes and pages produce today', async () => {
		const fresh = renderIntro(await buildIntroBySite(readSites()));
		expect(readFileSync(INTRO_PATH, 'utf8'), 'run `npm run runes:attributes`').toBe(fresh);
	}, 60000);

	it('has a partition per site that renders this content, main first (D7)', () => {
		expect(Object.keys(artifact)).toEqual(['main', 'staging']);
		expect(artifact.staging.map((r) => r.rune)).toEqual(records.map((r) => r.rune));
		const staged = artifact.staging.filter((r) => r.staged);
		expect(staged.map((r) => r.rune)).toEqual(['steps']);
		expect(staged[0]).toMatchObject({
			source: 'site/staged-runes/steps.md',
			compositionBadge: false,
		});
		expect(records.some((r) => r.staged)).toBe(false);
	});

	it('marks the live compositions, and only them', () => {
		expect(records.filter((r) => r.composed).map((r) => r.rune)).toEqual([
			'cta',
			'hero',
			'testimonial',
		]);
		expect(by.testimonial.schemaType).toBe('Review');
		expect(by.hint).toMatchObject({ packageLabel: 'core', composed: false });
		expect(by.hero.packageLabel).toBe('marketing');
	});
});
