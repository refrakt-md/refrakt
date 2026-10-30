import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parseCompositionDefinition } from '@refrakt-md/runes';
import { marketing } from '../../../plugins/marketing/src/index.js';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

/**
 * SPEC-181 D4, D6 — a composition that replaces a plugin rune is staged in
 * `site/staged-runes/`, where the staging site renders it and the comparison
 * tests read it. It is never written as a test fixture, where nobody reviews it
 * on a page and a second copy can drift from the reviewed one.
 */

const ROOT = join(__dirname, '..', '..', '..');

/** Conversions written before staging existed, each with the item that stages
 *  it. Remove an entry when its item lands; the test then holds the file to the
 *  convention. */
const NOT_YET_STAGED: Record<string, string> = {
	// The storytelling compositions: staged as a set (WORK-682), since the
	// plugin goes live or is retired as a whole (SPEC-147 D1).
	bond: 'WORK-682',
	character: 'WORK-682',
	faction: 'WORK-682',
	lore: 'WORK-682',
	realm: 'WORK-682',
	// SPEC-169's content-model fixture, which the conversion rewrites in
	// `site/staged-runes/` (WORK-678).
	steps: 'WORK-678',
};

/** Every rune name a shipping plugin provides, aliases included. */
function pluginRuneNames(): Map<string, string> {
	const out = new Map<string, string>();
	const plugins = [marketing, docs, storytelling, places, business, design, learning, media, plan];
	for (const plugin of plugins) {
		for (const [name, entry] of Object.entries(plugin.runes)) {
			for (const n of [name, ...(entry.aliases ?? [])]) out.set(n, plugin.name);
		}
	}
	return out;
}

/** Markdown files under every test fixture directory in the repository. */
function fixtureFiles(): string[] {
	const out: string[] = [];
	const walk = (dir: string, inFixtures: boolean) => {
		for (const entry of readdirSync(dir)) {
			if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
			const path = join(dir, entry);
			if (statSync(path).isDirectory()) {
				walk(path, inFixtures || entry === 'fixtures');
			} else if (inFixtures && entry.endsWith('.md')) {
				out.push(path);
			}
		}
	};
	for (const root of ['packages', 'plugins']) {
		for (const pkg of readdirSync(join(ROOT, root))) {
			const test = join(ROOT, root, pkg, 'test');
			try {
				if (statSync(test).isDirectory()) walk(test, false);
			} catch {
				// No test directory.
			}
		}
	}
	return out;
}

/** The file is a composed rune definition: frontmatter and a template that
 *  the definition parser accepts. */
function isDefinition(path: string): boolean {
	try {
		parseCompositionDefinition(basename(path, '.md'), readFileSync(path, 'utf-8'));
		return true;
	} catch {
		return false;
	}
}

describe('the staging convention (SPEC-181 D4, D6)', () => {
	const names = pluginRuneNames();
	const definitions = fixtureFiles().filter(isDefinition);

	it('finds the fixture definitions it guards', () => {
		// So the walk cannot silently match nothing.
		const found = definitions.map((p) => basename(p, '.md'));
		expect(found).toEqual(expect.arrayContaining(['teaser', 'steps', 'bond']));
	});

	it('no test fixture defines a composition of a shipping plugin rune', () => {
		const offenders = definitions
			.map((path) => ({ path, rune: basename(path, '.md') }))
			.filter(({ rune }) => names.has(rune) && !(rune in NOT_YET_STAGED))
			.map(
				({ path, rune }) =>
					`${relative(ROOT, path)}: "${rune}" is a ${names.get(rune)} rune. A composition that replaces a plugin rune is staged in site/staged-runes/${rune}.md, with a "prefer" entry on the staging site, and its tests read it there (SPEC-181 D4).`,
			);
		expect(offenders).toEqual([]);
	});

	it('lists only fixtures that still exist and still need staging', () => {
		const found = new Set(definitions.map((p) => basename(p, '.md')));
		for (const rune of Object.keys(NOT_YET_STAGED)) {
			expect(found.has(rune), `${rune} is no longer a fixture: remove it from NOT_YET_STAGED`).toBe(
				true,
			);
		}
	});

	it('has no copy of a staged rune left in a fixture directory', () => {
		const staged = readdirSync(join(ROOT, 'site', 'staged-runes')).map((f) => basename(f, '.md'));
		const copies = definitions.filter((p) => staged.includes(basename(p, '.md')));
		expect(copies.map((p) => relative(ROOT, p))).toEqual([]);
	});
});
