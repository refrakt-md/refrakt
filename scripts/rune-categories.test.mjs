import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runes as coreRunes, pluginRune } from '@refrakt-md/runes';

/**
 * SPEC-193 D9 — a rune's category is stated once, in its reference page's
 * frontmatter; its definition agrees, and the rune nav is grouped by it and
 * alphabetical within each group.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNES = join(ROOT, 'site/content/runes');

/** The ten core categories, in nav order (SPEC-193 D10). */
export const CORE_CATEGORIES = [
	'Sections & blocks',
	'Text & inline',
	'Values',
	'Arrangement',
	'Disclosure',
	'Backgrounds & color',
	'Code',
	'Data',
	'Reuse & references',
	'Site',
];

const PLUGINS = [
	'business',
	'design',
	'docs',
	'learning',
	'marketing',
	'media',
	'places',
	'plan',
	'storytelling',
];

function frontmatter(file) {
	const block = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
	const get = (key) =>
		block
			.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
			.trim()
			.replace(/^(["'])(.*)\1$/, '$2');
	return { title: get('title'), category: get('category'), type: get('type') };
}

/** Every page under runes/, keyed by its nav path (`hint`, `marketing/hero`). */
function pages() {
	const out = new Map();
	const walk = (dir) => {
		for (const entry of readdirSync(dir)) {
			const abs = join(dir, entry);
			if (statSync(abs).isDirectory()) walk(abs);
			else if (entry.endsWith('.md') && entry !== '_layout.md') {
				const path = relative(RUNES, abs)
					.replace(/\.md$/, '')
					.replace(/\/index$/, '');
				out.set(path, { ...frontmatter(abs), path });
			}
		}
	};
	walk(RUNES);
	return out;
}

/** The rune nav's groups: `[{ title, items: [path, …] }]`. */
function navGroups() {
	const layout = readFileSync(join(RUNES, '_layout.md'), 'utf8');
	const nav = layout.slice(layout.indexOf('{% nav'), layout.indexOf('{% /nav %}'));
	const groups = [];
	for (const line of nav.split('\n').map((l) => l.trim())) {
		const heading = line.match(/^## (.+)$/);
		if (heading) groups.push({ title: heading[1], items: [] });
		else if (groups.length && /^- [a-z]/.test(line)) groups.at(-1).items.push(line.slice(2));
	}
	return groups;
}

const all = pages();
const byTitle = (a, b) =>
	all.get(a).title.toLowerCase().localeCompare(all.get(b).title.toLowerCase());

describe('rune categories (SPEC-193 D9, D10)', () => {
	it('every core rune page takes one of the ten categories', () => {
		const core = [...all.values()].filter((p) => !p.path.includes('/') && p.type === 'rune');
		expect(core.length).toBeGreaterThan(50);
		for (const page of core) expect(CORE_CATEGORIES, page.path).toContain(page.category);
	});

	it('a core rune definition states its page’s category', () => {
		for (const [name, rune] of Object.entries(coreRunes)) {
			const page = all.get(name);
			if (!page || page.type !== 'rune') continue;
			expect(rune.category, name).toBe(page.category);
		}
	});

	it('a plugin rune’s category is its plugin’s, as its page’s is', async () => {
		for (const plugin of PLUGINS) {
			const mod = await import(`@refrakt-md/${plugin}`);
			const pkg =
				mod.default ?? Object.values(mod).find((v) => v && typeof v === 'object' && 'runes' in v);
			for (const [name, entry] of Object.entries(pkg.runes)) {
				const page = all.get(`${plugin}/${name}`);
				if (!page || page.type !== 'rune') continue;
				expect(pluginRune(name, entry, pkg).category, `${plugin}/${name}`).toBe(page.category);
			}
		}
	});
});

describe('the rune nav (SPEC-193 D9)', () => {
	const groups = navGroups();
	const grouped = new Map(groups.flatMap((g) => g.items.map((i) => [i, g.title])));

	it('lists every rune page, in the group of its category', () => {
		for (const page of all.values()) {
			if (page.type !== 'rune' && !CORE_CATEGORIES.includes(page.category)) continue;
			expect(grouped.get(page.path), page.path).toBe(page.category);
		}
	});

	it('orders the core groups as D10 does, and each group alphabetically by title', () => {
		const core = groups.filter((g) => CORE_CATEGORIES.includes(g.title)).map((g) => g.title);
		expect(core).toEqual(CORE_CATEGORIES);
		for (const g of groups) {
			// A plugin group, and Essentials, open with their overview page.
			const lead = CORE_CATEGORIES.includes(g.title) ? 0 : 1;
			const rest = g.items.slice(lead);
			expect(rest, g.title).toEqual([...rest].sort(byTitle));
		}
	});
});
