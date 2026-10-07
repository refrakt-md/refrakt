import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Schema, Tag } from '@markdoc/markdoc';
import {
	tags as coreTags,
	nodes,
	extractHeadings,
	runeTagMap,
	defineRune,
	splitFixture,
} from '@refrakt-md/runes';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

/**
 * One node per `data-name` — SPEC-143's carried-forward constraint, asserted
 * beside the structure contract so it covers hand-written transforms too.
 *
 * `data-name` is an address: the editor resolves `editHints` against it, the
 * engine's `layout` keys a map by it (last write wins, the rest fall through to
 * the root), and a theme's `projection` hides or moves by it. Two nodes under
 * one rune carrying the same name are ambiguous to the first, lossy for the
 * second and reachable by the third. `createComponentRenderable` names *every*
 * node of a ref it is handed, so a rune passing an unwrapped multi-node cursor
 * produces exactly that, and nothing checked it.
 *
 * The structure contract is derived from config and cannot see a transform's
 * output, so the assertion runs over rendered output instead: every fixture in
 * the corpus — the core rune fixtures, each plugin rune's own `fixture`, and the
 * SEO-baseline fixtures — through the schema transform. Within each rune, the
 * names of the nodes it owns (everything below it down to, and including, the
 * root of a nested rune) must be distinct.
 *
 * `KNOWN_DUPLICATES` records the runes that break it today. It is a report, not
 * an exemption to grow: an entry fails the test once the rune stops repeating
 * the name, so the list can only shrink.
 */

const PLUGINS = [marketing, docs, storytelling, places, business, design, learning, media, plan];

const pluginRunes: Record<string, ReturnType<typeof defineRune>> = {};
const fixtures: Array<{ source: string; body: string }> = [];
for (const pkg of PLUGINS) {
	for (const [name, entry] of Object.entries(pkg.runes ?? {})) {
		pluginRunes[name] = defineRune({
			name,
			schema: entry.transform as Schema,
			aliases: entry.aliases,
		});
		if (entry.fixture) fixtures.push({ source: `${pkg.name}:${name}`, body: entry.fixture });
	}
}
const tags = { ...coreTags, ...runeTagMap(pluginRunes), ...Markdoc.tags };

const ROOT = join(__dirname, '..', '..', '..');
for (const dir of ['packages/runes/fixtures', 'contracts/seo-baseline/fixtures']) {
	for (const file of readdirSync(join(ROOT, dir)).sort()) {
		if (!file.endsWith('.md')) continue;
		const { body } = splitFixture(readFileSync(join(ROOT, dir, file), 'utf-8'));
		fixtures.push({ source: `${dir}/${file}`, body });
	}
}

/**
 * Rune → the data-names it repeats today, recorded when the assertion landed
 * (WORK-614). Shrink-only.
 *
 * Two kinds, and the first is the sharper:
 *
 * - **In the slot bag.** `palette` `group`, `spacing` `section`,
 *   `plan-progress` `group` and `deflist` `row` repeat a name among the rune
 *   root's *direct* children — the flat bag `layout` reads through
 *   `mapDataNames`, where the last node of a name wins and the rest fall
 *   through to the root unplaced.
 * - **Repeated item elements.** Every other entry names each item of a
 *   collection the same (`recipe` `ingredient`, `diff` `line`, `grid` `cell`)
 *   so the item gets its BEM element class. Not lossy for `layout`, which never
 *   looks that deep, but ambiguous to the editor's `editHints` lookup and
 *   reachable by `projection`.
 */
const KNOWN_DUPLICATES: Record<string, string[]> = {
	// Repeat a name in the slot bag (deflist `row`, palette `group`, plan-progress
	// `group`, spacing `section`); their other entries are repeated item elements.
	deflist: ['row'],
	palette: [
		'group',
		'group-title',
		'swatch',
		'swatch-color',
		'swatch-name',
		'swatch-value',
		'swatch-contrast',
		'swatch-a11y',
		'swatch-a11y--pass',
		'swatch-a11y--fail',
		'scale-stop',
	],
	'plan-progress': ['group', 'heading'],
	spacing: [
		'section',
		'section-title',
		'scale-item',
		'scale-bar',
		'scale-label',
		'scale-multiplier',
		'radius-item',
		'radius-sample',
		'radius-label',
		'radius-value',
		'shadow-item',
		'shadow-sample',
		'shadow-label',
	],
	// Repeated item elements only.
	'call-to-action': ['action'],
	'code-group': ['tab', 'panel'],
	diff: ['line', 'gutter-num', 'line-content'],
	feature: ['feature-item'],
	gallery: ['item'],
	grid: ['cell'],
	hero: ['action'],
	'how-to': ['tool', 'step'],
	mockup: ['traffic-light'],
	pagination: ['marker', 'label'],
	playlist: ['track-name', 'track-artist', 'track-duration', 'duration', 'track-meta'],
	recipe: ['ingredient', 'step'],
	typography: [
		'specimen',
		'specimen-header',
		'specimen-role',
		'specimen-family',
		'sizes',
		'size-sample',
		'size-label',
		'weights',
		'weight-sample',
		'weight-label',
	],
};

function render(body: string): RenderableTreeNode {
	const ast = Markdoc.parse(body);
	return Markdoc.transform(ast, {
		tags,
		nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: '/fixture.md',
			headings: extractHeadings(ast),
			__source: body,
			__icons: { global: {} },
			file: { created: '2026-01-01', modified: '2026-01-02' },
		},
	} as never);
}

const isTag = (n: unknown): n is Tag => Markdoc.Tag.isTag(n as never);

/** Every rune in the tree, with the names its owned nodes repeat. */
function duplicatesIn(tree: RenderableTreeNode): Array<{ rune: string; names: string[] }> {
	const out: Array<{ rune: string; names: string[] }> = [];
	const visitRune = (root: Tag): void => {
		const counts = new Map<string, number>();
		const walk = (n: Tag): void => {
			for (const child of n.children) {
				if (!isTag(child)) continue;
				const name = child.attributes['data-name'];
				if (typeof name === 'string') counts.set(name, (counts.get(name) ?? 0) + 1);
				if (child.attributes['data-rune']) visitRune(child);
				else walk(child);
			}
		};
		walk(root);
		const names = [...counts].filter(([, c]) => c > 1).map(([n]) => n);
		if (names.length > 0) out.push({ rune: String(root.attributes['data-rune']), names });
	};
	const find = (n: unknown): void => {
		if (Array.isArray(n)) return n.forEach(find);
		if (!isTag(n)) return;
		if (n.attributes['data-rune']) visitRune(n);
		else n.children.forEach(find);
	};
	find(tree);
	return out;
}

const found = new Map<string, Map<string, Set<string>>>();
for (const { source, body } of fixtures) {
	for (const { rune, names } of duplicatesIn(render(body))) {
		const byName = found.get(rune) ?? new Map<string, Set<string>>();
		for (const name of names) {
			const sources = byName.get(name) ?? new Set<string>();
			sources.add(source);
			byName.set(name, sources);
		}
		found.set(rune, byName);
	}
}

describe('one node per data-name (SPEC-143)', () => {
	it('covers a real corpus', () => {
		expect(fixtures.length).toBeGreaterThan(100);
	});

	it('no rune outside the known list puts one data-name on two of its nodes', () => {
		const unexpected: string[] = [];
		for (const [rune, byName] of found) {
			for (const [name, sources] of byName) {
				if (!KNOWN_DUPLICATES[rune]?.includes(name)) {
					unexpected.push(`${rune}: data-name="${name}" (in ${[...sources].join(', ')})`);
				}
			}
		}
		expect(unexpected).toEqual([]);
	});

	it('every known duplicate still occurs — fix one, delete its entry', () => {
		const stale: string[] = [];
		for (const [rune, names] of Object.entries(KNOWN_DUPLICATES)) {
			for (const name of names) {
				if (!found.get(rune)?.has(name)) stale.push(`${rune}: ${name}`);
			}
		}
		expect(stale).toEqual([]);
	});
});
