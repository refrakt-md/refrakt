import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import type { Node, Schema } from '@markdoc/markdoc';
import {
	tags as coreTags,
	nodes as coreNodes,
	runes as coreRunes,
	baseConfig,
	loadPlugin,
	mergePlugins,
	serializeTree,
	tableFor,
	OWNER_ATTR,
	SLOT_ATTR,
} from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import { assembleMarkdocSchemas } from '../src/site.js';

/**
 * SPEC-145 D10a step 5 — the survival test that gates placement (WORK-621).
 *
 * Composition marks every node it places with `data-owner` and `data-slot` on
 * the AST, before `Markdoc.transform`. Each primitive then transforms that
 * content, and a primitive that rebuilds a node rather than passing it through
 * drops the marker. Nothing reports that: a property absent from the JSON-LD
 * looks exactly like an optional property left empty. So this runs a marked
 * node of each block kind through every rune a composition may place into, and
 * fails naming the rune that loses either attribute.
 *
 * ## The placement set is derived, not listed
 *
 * D12: the placeable set is what survives two exclusions, read here from the
 * same declarations the build reads, so a rune added tomorrow is in or out by
 * rule rather than by someone remembering this file —
 *
 * - **`requiresParent`** (SPEC-084): a composition's own rune is the nearest
 *   ancestor of whatever its template places, so a parent-requiring rune placed
 *   directly always fails the engine's check.
 * - **a peer schema type** (D9): a rune emitting a type of its own, by its
 *   schema table or `seoType`. D9's refinement admits a *subordinate* type — an
 *   `ImageObject` becoming the outer entity's `image` — and `SUBORDINATE_TYPES`
 *   is that refinement stated as types, not as runes.
 *
 * ## What counts as a drop
 *
 * Probe content the rune renders, with neither marker on any element holding
 * it. Content a rune does not render at all — `deflist` given a paragraph — is
 * not a drop: there is nothing placed for the marker to be on.
 */

const ROOT = (() => {
	let dir = dirname(fileURLToPath(import.meta.url));
	while (!existsSync(join(dir, 'refrakt.config.json'))) dir = dirname(dir);
	return dir;
})();

/**
 * D9's subordinate types: a media object that becomes a property of the outer
 * entity rather than competing with it. `figure` and `gallery` are D9's own
 * examples; `embed`'s `VideoObject` is the same case.
 */
const SUBORDINATE_TYPES = new Set([
	'ImageObject',
	'ImageGallery',
	'VideoObject',
	'AudioObject',
	'MediaObject',
]);

/** One marked block of each kind composition can place from slot content. */
const PROBES: Record<string, { source: string; marks?: (placed: Node[]) => Node[] }> = {
	paragraph: { source: 'Placed SLOTPROBE text.' },
	// D10a's own measurement marked the image, inside the paragraph that wraps it.
	image: {
		source: '![SLOTPROBE alt](/slotprobe.png)',
		marks: (placed) => findAst(placed, 'image'),
	},
	list: { source: '- SLOTPROBE one\n- two' },
	heading: { source: '## SLOTPROBE heading' },
	blockquote: { source: '> SLOTPROBE quote' },
	fence: { source: '```js\nSLOTPROBE()\n```' },
	table: { source: '| SLOTPROBE | b |\n|---|---|\n| 1 | 2 |' },
};

/** Attributes a rune cannot be invoked without, so the probe reaches its transform. */
const PROBE_ATTRS: Record<string, string> = { icon: ' name="star"' };

/**
 * Runes resolved by a preprocess hook. They are rewritten into other content
 * before any transform runs, so a marker on them is the preprocess's to carry,
 * not the transform's — this test cannot reach them, and says so by name.
 */
const PREPROCESS_ONLY = new Set(['snippet', 'data', 'include']);

/**
 * Placements that drop the markers today — D10a step 5's "kept out of D12's set
 * until it is" fixed, per node kind, with the reason. Every entry is a rune that
 * reinterprets that kind of node as its own structure, rebuilding it instead of
 * passing it through, so the placed node does not reach the output as itself.
 *
 * The test fails on a drop missing here **and** on an entry that no longer
 * drops, so this stays the measured list rather than a tolerance.
 */
const NOT_YET_PLACEABLE: Record<string, Record<string, string>> = {
	nav: { list: 'rebuilds each list item as a `nav-item` rune' },
	tabs: {
		heading: 'rebuilds a heading as a `tab` button label',
		list: 'rebuilds list items as `tab` buttons',
	},
	'budget-category': { list: 'rebuilds each list item as a `budget-line-item` rune' },
	conversation: { blockquote: 'rebuilds each blockquote as a `conversation-message` rune' },
	reveal: { heading: 'rebuilds a heading as a `reveal-step` name' },
	form: {
		paragraph: 'rebuilds a paragraph as its own `text` paragraph',
		list: 'rebuilds a list as a `form-field` of choices',
		heading: 'rebuilds a heading as a fieldset legend',
		blockquote: 'rebuilds a blockquote as a `help` paragraph',
	},
	comparison: {
		heading: 'rebuilds a heading as a header cell of its table',
		list: 'rebuilds a list into its table',
	},
	'symbol-group': { list: 'rebuilds each list item as a `symbol-member` rune' },
	changelog: { heading: 'rebuilds a heading as a `changelog-release` version' },
	preview: { fence: 'rebuilds the fence as its `source` view' },
};

type Outcome = 'carried' | 'not-rendered' | { dropped: string[] };

// biome-ignore lint/suspicious/noExplicitAny: a rendered tree is untyped JSON
type Json = any;

function findAst(nodes: Node[], type: string): Node[] {
	const out: Node[] = [];
	const visit = (n: Node) => {
		if (n.type === type) out.push(n);
		for (const c of n.children ?? []) visit(c);
	};
	for (const n of nodes) visit(n);
	return out;
}

function findTree(node: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] {
	if (Array.isArray(node)) {
		for (const c of node) findTree(c, pred, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (pred(node)) out.push(node);
	for (const c of node.children ?? []) findTree(c, pred, out);
	return out;
}

function textOf(node: Json): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(textOf).join('');
	if (!node || typeof node !== 'object') return '';
	return (node.children ?? []).map(textOf).join('');
}

const holdsProbe = (n: Json): boolean =>
	typeof n.name === 'string' &&
	(n.name === 'img' ? String(n.attributes?.alt ?? '') : textOf(n)).includes('SLOTPROBE');

let schemas: { tags: Record<string, Schema>; nodes: Record<string, Schema> };
let identity: (tree: Json) => Json;
let placementSet: string[];
let excluded: Record<string, string>;

function render(
	name: string,
	kind: string,
	config: { tags: Record<string, Schema>; nodes: Record<string, Schema> },
): Json {
	const source = `{% ${name}${PROBE_ATTRS[name] ?? ''} %}\nIntro text.\n\n{% /${name} %}\n`;
	const ast = Markdoc.parse(source);
	const tag = findAst([ast], 'tag').find((n) => n.tag === name);
	if (!tag) throw new Error(`no {% ${name} %} in the probe source`);
	const probe = PROBES[kind];
	const placed = Markdoc.parse(probe.source).children;
	for (const n of probe.marks ? probe.marks(placed) : placed) {
		n.attributes[OWNER_ATTR] = 'probe-owner';
		n.attributes[SLOT_ATTR] = 'probe-slot';
	}
	tag.children.push(...placed);
	const rendered = Markdoc.transform(ast, {
		...config,
		variables: {
			generatedIds: new Set<string>(),
			path: '/probe',
			headings: [],
			__source: source,
			__sourcePath: 'probe.md',
		},
	} as never);
	// The rendered output: serialized and through the identity transform, so a
	// marker the engine drops counts as dropped too.
	return identity(serializeTree(rendered));
}

function outcome(tree: Json): Outcome {
	const carriers = findTree(tree, holdsProbe);
	if (carriers.length === 0) return 'not-rendered';
	const marked = (attr: string, value: string) =>
		carriers.some((n) => n.attributes?.[attr] === value);
	if (marked(OWNER_ATTR, 'probe-owner') && marked(SLOT_ATTR, 'probe-slot')) {
		// Both on one element, not split across two.
		const both = carriers.some(
			(n) =>
				n.attributes?.[OWNER_ATTR] === 'probe-owner' && n.attributes?.[SLOT_ATTR] === 'probe-slot',
		);
		if (both) return 'carried';
	}
	return {
		dropped: [OWNER_ATTR, SLOT_ATTR].filter(
			(a) => !marked(a, a === OWNER_ATTR ? 'probe-owner' : 'probe-slot'),
		),
	};
}

beforeAll(async () => {
	const config = JSON.parse(readFileSync(join(ROOT, 'refrakt.config.json'), 'utf8'));
	const pluginNames: string[] = config.sites?.main?.plugins ?? config.plugins ?? [];
	const loaded = await Promise.all(pluginNames.map((n) => loadPlugin(n)));
	const merged = mergePlugins(loaded, new Set(Object.keys(coreRunes)));
	const { config: theme } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions,
		provenance: merged.provenance,
		presetMap: {},
	});
	identity = createTransform(theme) as never;
	schemas = assembleMarkdocSchemas(merged.tags);

	// D12, derived. A rune's config is keyed by its `typeName`, which for a
	// plugin rune is only recoverable as the PascalCase of its kebab name — the
	// same match the engine makes against `data-rune`.
	const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	const configs: Record<string, RuneConfig> = {};
	for (const [key, cfg] of Object.entries(theme.runes)) configs[kebab(key)] = cfg as RuneConfig;
	excluded = {};
	placementSet = [];
	for (const [name, rune] of Object.entries({ ...coreRunes, ...merged.runes })) {
		const cfg = (rune.typeName && theme.runes[rune.typeName]) || configs[name];
		const parent = cfg?.requiresParent;
		if (parent && parent !== '*') {
			excluded[name] = `requiresParent: ${parent}`;
			continue;
		}
		const table = tableFor(rune);
		const types = [
			rune.seoType,
			table?.type,
			table?.fallback?.type,
			...Object.values(table?.rows ?? {}).map((r) => r.type),
		].filter((t): t is string => Boolean(t));
		const peer = types.find((t) => !SUBORDINATE_TYPES.has(t));
		if (peer) {
			excluded[name] = `peer schema type: ${peer}`;
			continue;
		}
		placementSet.push(name);
	}
});

describe('the slot markers are declared once, at config assembly (SPEC-145 D10a)', () => {
	it('is what carries them: undeclared, a marked paragraph loses both', () => {
		// The control. D10a measured it first: Markdoc keeps only declared
		// attributes, so without the assembly step nothing survives.
		const raw = {
			tags: coreTags as Record<string, Schema>,
			nodes: coreNodes as Record<string, Schema>,
		};
		expect(outcome(render('hint', 'paragraph', raw))).toEqual({
			dropped: [OWNER_ATTR, SLOT_ATTR],
		});
		expect(outcome(render('hint', 'paragraph', schemas))).toBe('carried');
	});

	it('declares them on every node and tag schema, and on no rune of its own', () => {
		for (const [name, schema] of [
			...Object.entries(schemas.tags),
			...Object.entries(schemas.nodes),
		]) {
			expect(schema.attributes?.[OWNER_ATTR], name).toBeDefined();
			expect(schema.attributes?.[SLOT_ATTR], name).toBeDefined();
		}
		// Markdoc falls back to its own schema for a node `nodes` does not
		// override, so the defaults have to be covered as well.
		for (const name of ['blockquote', 'hr', 'code', 's', 'inline']) {
			expect(schemas.nodes[name]?.attributes?.[SLOT_ATTR], name).toBeDefined();
		}
		// The runes' own declarations, which authoring tools read, are untouched.
		for (const [name, schema] of Object.entries(coreTags as Record<string, Schema>)) {
			expect(schema.attributes?.[OWNER_ATTR], name).toBeUndefined();
		}
	});
});

describe('a marked node survives every rune in D12’s placement set (SPEC-145 D10a step 5)', () => {
	it('derives the set from the two exclusions', () => {
		// D9's table of runes that emit no schema, plus its subordinate emitters.
		for (const name of [
			'card',
			'section',
			'bar',
			'deflist',
			'details',
			'badge',
			'hint',
			'mediatext',
			'hero',
			'grid',
			'textblock',
			'steps',
			'feature',
			'tabs',
			'progress',
			'figure',
			'gallery',
		]) {
			expect(placementSet, name).toContain(name);
		}
		// D12's table, and D9's peer emitters.
		for (const name of ['accordion-item', 'tab', 'bento-cell', 'definition', 'step', 'tier']) {
			expect(excluded[name], name).toMatch(/^requiresParent/);
		}
		for (const name of ['howto', 'recipe', 'character', 'event', 'playlist', 'pricing']) {
			expect(excluded[name], name).toMatch(/^peer schema type/);
		}
	});

	it('keeps both attributes on every placed node a rune renders', () => {
		const drops: Record<string, Record<string, string[]>> = {};
		for (const name of placementSet) {
			if (PREPROCESS_ONLY.has(name)) continue;
			for (const kind of Object.keys(PROBES)) {
				const result = outcome(render(name, kind, schemas));
				if (typeof result === 'object') (drops[name] ??= {})[kind] = result.dropped;
			}
		}

		const unexpected = Object.entries(drops).flatMap(([name, kinds]) =>
			Object.entries(kinds)
				.filter(([kind]) => !NOT_YET_PLACEABLE[name]?.[kind])
				.map(([kind, lost]) => `${name}: a placed ${kind} lost ${lost.join(' and ')}`),
		);
		expect(unexpected, 'runes that drop a slot marker').toEqual([]);

		const fixed = Object.entries(NOT_YET_PLACEABLE).flatMap(([name, kinds]) =>
			Object.keys(kinds)
				.filter((kind) => !drops[name]?.[kind])
				.map((kind) => `${name}: ${kind} now keeps its markers — remove it from NOT_YET_PLACEABLE`),
		);
		expect(fixed).toEqual([]);
	});

	it('names the runes it cannot reach, and only those', () => {
		// Every other rune in the set transforms from a bare invocation; these
		// three throw by design when a transform meets them unresolved.
		const unreachable = placementSet.filter((name) => {
			try {
				render(name, 'paragraph', schemas);
				return false;
			} catch (e) {
				return /reached the transform phase unresolved/.test(String(e));
			}
		});
		expect(new Set(unreachable)).toEqual(PREPROCESS_ONLY);
	});

	it('leaves the placed node’s own rendering alone', () => {
		// Two extra attributes, nothing else: the image is the image it was.
		const tree = render('figure', 'image', schemas);
		const [img] = findTree(tree, (n) => n.name === 'img');
		expect(img.attributes).toMatchObject({
			src: '/slotprobe.png',
			alt: 'SLOTPROBE alt',
			[OWNER_ATTR]: 'probe-owner',
			[SLOT_ATTR]: 'probe-slot',
		});
	});
});
