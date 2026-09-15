/**
 * Baseline the structured data every rune emits today (WORK-562 / SPEC-130).
 *
 * `contracts/seo-baseline/baseline.json` is committed and diffable. It records,
 * per fixture, the JSON-LD `extractSeo` harvests from the schema-transformed
 * tree, plus the RDFa the identity transform actually renders. SPEC-130 rewrites
 * that channel across 30 runes in 10 packages, and JSON-LD is the one output
 * nobody looks at — a page renders identically whether its structured data is
 * right or ruined. So every migration step in the milestone is reviewed as a
 * diff against this file rather than as a leap.
 *
 * **Nothing here is tidied.** The baseline records today's output including its
 * defects: `playlist type="podcast"` emits `MusicPlaylist` (BUG-013),
 * `organization type="NonProfit"` publishes a type schema.org does not have,
 * the seven Group A runes assert a type and describe nothing, and
 * `{% accordion-item %}` builds a `Question` with no `name`. A baseline that has
 * been cleaned up cannot prove a later change was deliberate.
 *
 * ## Two harvest points, both captured
 *
 * `jsonLd` is the **pre-engine** harvest — `extractSeo` over the
 * schema-transformed tree, which is where `packages/content/src/site.ts` reads
 * it. `rendered` is the **post-engine** view: the same tree after
 * `createTransform`, both distilled (`rendered.jsonLd`) and as the literal
 * annotation outline (`rendered.annotations`). WORK-563 asserts those two points
 * agree; this file is what it compares against.
 *
 * ## Why the fixtures live here and not in `plugins/*∕fixtures/`
 *
 * `plugins/<pkg>/fixtures/` is a real convention — `discoverPluginFixtures`
 * reads it and `refrakt inspect` renders from it — but no plugin ships one today.
 * Promoting these fixtures there would change `inspect` output and the examples
 * generator, which is a deliberate change of its own and not this item's. These
 * are generator inputs for one committed artifact, so they sit beside it.
 *
 * ## The gap this closes, measured
 *
 * Before this corpus, 12 of the 30 emitting runes had no JSON-LD assertion
 * anywhere in the repo: `gallery`, `budget`, `itinerary`, `symbol`, `blog`,
 * `cast-member`, `pricing`, `tier`, `timeline-entry`, `track`,
 * `breadcrumb-item` and `accordion-item`. The other 18 were covered by the
 * hand-written `seo.test.ts` files, which stay in place as statements of intent.
 *
 * ## How the fixtures were checked
 *
 * A fixture that uses the wrong content model still transforms — it just emits a
 * thinner entity, and the generator passes. Writing this corpus, five fixtures
 * did exactly that (`recipe` and `howto` wanted bare lists rather than headings,
 * `timeline` wanted headings rather than a list, `testimonial` wanted a
 * blockquote, `cast` wanted `- Name - Role` plain text). Each was caught by
 * diffing the fixture's emitted property set against the same rune's first
 * example on its `site/content/runes/**` doc page, and every canonical fixture
 * now matches its doc example exactly.
 *
 * That comparison is not a test here: doc pages change for their own reasons, and
 * pinning the two together would fail spuriously. What guards the corpus instead
 * is the committed artifact — thinning a fixture shows up as properties
 * disappearing from a reviewed diff — plus the drift test asserting that exactly
 * the seven Group A runes emit a bare entity and nothing else does.
 *
 * Usage:
 *   node scripts/generate-seo-baseline.mjs           # write the artifact
 *   node scripts/generate-seo-baseline.mjs --check   # exit 1 if stale
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import {
	tags as coreTags,
	nodes,
	functions,
	runes as coreRunes,
	baseConfig,
	extractHeadings,
	extractSeo,
	collectJsonLd,
	loadPlugin,
	mergePlugins,
	parseFixture,
} from '@refrakt-md/runes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURES_DIR = join(ROOT, 'contracts/seo-baseline/fixtures');
export const ARTIFACT_PATH = join(ROOT, 'contracts/seo-baseline/baseline.json');
export const REGENERATE_COMMAND = 'npm run seo:baseline';

/**
 * The runes SPEC-130 migrates, by the group that decides their migration shape.
 *
 * Declared rather than discovered, for the reason `coverageGaps` exists in
 * `generate-rune-attributes.mjs`: a rune dropped from the fixture set would
 * otherwise simply be absent, and a freshness check would still pass because the
 * artifact matches what the generator produced.
 */
export const EMITTING_RUNES = {
	// Group A — assert a type and describe nothing.
	A: ['gallery', 'datatable', 'budget', 'itinerary', 'map', 'symbol', 'blog'],
	// Group B — a flat map of named refs.
	B: [
		'figure',
		'embed',
		'cast-member',
		'character',
		'realm',
		'faction',
		'plot',
		'lore',
		'organization',
		'pricing',
		'tier',
		'timeline-entry',
		'track',
		'breadcrumb-item',
	],
	// Group C — imperative construction.
	C: [
		'accordion',
		'accordion-item',
		'breadcrumb',
		'event',
		'howto',
		'playlist',
		'recipe',
		'testimonial',
		'timeline',
	],
};

/**
 * Runes with no authorable tag of their own, and the fixture that covers them.
 *
 * `breadcrumb-item` is not in the tag map at all — `breadcrumb`'s transform
 * builds those nodes itself — so no fixture can name it as its `rune`. It still
 * carries a schema row in SPEC-130's Group B, so it still needs a baseline.
 */
export const COVERED_BY_PARENT = { 'breadcrumb-item': 'breadcrumb' };

/** Every rune in the three groups, flat. */
export function allEmittingRunes() {
	return [...EMITTING_RUNES.A, ...EMITTING_RUNES.B, ...EMITTING_RUNES.C];
}

/** The group letter a rune belongs to, or `undefined`. */
export function groupOf(rune) {
	for (const [letter, members] of Object.entries(EMITTING_RUNES)) {
		if (members.includes(rune)) return letter;
	}
	return undefined;
}

/** The named site's entry in `refrakt.config.json`. */
export function siteConfig(site = 'main', root = ROOT) {
	const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
	const entry = config.sites?.[site];
	if (!entry) throw new Error(`No site "${site}" in refrakt.config.json`);
	return entry;
}

/** Plugins the named site loads, from `refrakt.config.json`. */
export function pluginsForSite(site = 'main', root = ROOT) {
	return siteConfig(site, root).plugins ?? [];
}

/**
 * Assemble the tag map and identity transform the way a real build does.
 *
 * Mirrors `transformContent` in `packages/content/src/site.ts` (schema transform)
 * and `assembleSiteContext` in `packages/content/src/refract-loader.ts` (engine),
 * both of which are module-private. The plugin list is read from config rather
 * than hard-coded, so a plugin added to the site reaches the baseline.
 */
export async function buildContext(site = 'main', root = ROOT) {
	const entry = siteConfig(site, root);
	const pluginNames = entry.plugins ?? [];
	const loaded = await Promise.all(pluginNames.map((name) => loadPlugin(name)));
	// `prefer` resolves rune-name collisions between plugins. Unset in this repo,
	// but passed through so a future config change moves the baseline with the
	// build instead of quietly diverging from it.
	const merged = mergePlugins(loaded, new Set(Object.keys(coreRunes)), entry.runes?.prefer);
	const { config } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions,
		provenance: merged.provenance,
		presetMap: {},
	});
	return {
		tags: { ...coreTags, ...merged.tags },
		identity: createTransform(config),
		pluginNames,
	};
}

/**
 * Sort object keys recursively, leaving array order alone.
 *
 * Key order is not part of the contract — SPEC-130 measured four runes whose two
 * harvest points differ in key order only, because the engine relocates their
 * meta tags to the end of the block. Array order *is* part of the contract:
 * `itemListElement`, `step`, `track` and `recipeInstructions` are ordered
 * sequences and a reordering is a real defect, so it must still show as a diff.
 */
export function normalize(value) {
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === 'object') {
		const out = {};
		for (const key of Object.keys(value).sort()) out[key] = normalize(value[key]);
		return out;
	}
	return value;
}

/**
 * The RDFa outline of a rendered tree: every node carrying `typeof` or
 * `property`, nested as it appears, with the value a distiller would read.
 *
 * This is the literal rendered annotation rather than a distilled graph, so it
 * shows *where* the attributes sit — which is what explains a key-order
 * difference between the two harvest points instead of just surfacing one.
 */
export function rdfaOutline(node) {
	const out = [];
	walkRdfa(node, out);
	return out;
}

function walkRdfa(node, out) {
	if (Array.isArray(node)) {
		for (const child of node) walkRdfa(child, out);
		return;
	}
	if (!node || typeof node !== 'object') return;
	const attrs = node.attributes ?? {};
	const annotated = attrs.typeof !== undefined || attrs.property !== undefined;
	const children = [];
	for (const child of node.children ?? []) walkRdfa(child, children);
	if (!annotated) {
		out.push(...children);
		return;
	}
	const entry = { element: node.name };
	if (attrs.typeof !== undefined) entry.typeof = attrs.typeof;
	if (attrs.property !== undefined) entry.property = attrs.property;
	// A value is read only where the distiller reads one: `collectProperties`
	// extracts from a node carrying `property` and *not* `typeof`. A node with
	// both is a nested entity, and a node with only `typeof` is an entity root —
	// for either, the concatenated text of the whole subtree is noise that would
	// bloat the artifact and make every diff harder to read.
	if (attrs.property !== undefined && attrs.typeof === undefined) {
		if (attrs.content !== undefined) entry.content = attrs.content;
		else if (attrs.href !== undefined) entry.href = attrs.href;
		else if (attrs.src !== undefined) entry.src = attrs.src;
		else {
			const text = textOf(node);
			if (text) entry.text = text;
		}
	}
	if (children.length > 0) entry.children = children;
	out.push(entry);
}

function textOf(node) {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(textOf).join('');
	if (!node || typeof node !== 'object') return '';
	return (node.children ?? []).map(textOf).join('');
}

/** Read the fixture corpus, sorted by filename so the artifact is byte-stable. */
export function readFixtures(dir = FIXTURES_DIR) {
	return readdirSync(dir)
		.filter((f) => f.endsWith('.md'))
		.sort()
		.map((file) => ({ file, ...parseFixture(readFileSync(join(dir, file), 'utf8'), file) }));
}

/** Harvest one fixture at both points. */
export function harvest(fixture, ctx) {
	const ast = Markdoc.parse(fixture.body);
	const config = {
		tags: ctx.tags,
		nodes,
		functions,
		variables: {
			generatedIds: new Set(),
			path: `/${fixture.file.replace(/\.md$/, '')}`,
			headings: extractHeadings(ast),
			__source: fixture.body,
			__icons: { global: {} },
		},
	};
	const renderable = Markdoc.transform(ast, config);
	const { jsonLd } = extractSeo(renderable, {}, '/seo-baseline');
	// The serialize step the SvelteKit boundary forces, and which the engine
	// expects: Tag instances become plain `{$$mdtype:'Tag'}` objects.
	const serialized = JSON.parse(JSON.stringify(renderable));
	const rendered = ctx.identity(serialized);
	return {
		jsonLd: normalize(jsonLd),
		rendered: {
			jsonLd: normalize(collectJsonLd(rendered)),
			annotations: normalize(rdfaOutline(rendered)),
		},
	};
}

/**
 * Runes in {@link EMITTING_RUNES} that no fixture covers.
 *
 * A rune is covered when a fixture names it, or when it is an internal rune whose
 * {@link COVERED_BY_PARENT} parent is covered.
 */
export function coverageGaps(entries) {
	const named = new Set(entries.map((e) => e.rune));
	return allEmittingRunes().filter((rune) => {
		if (named.has(rune)) return false;
		const parent = COVERED_BY_PARENT[rune];
		return !(parent && named.has(parent));
	});
}

/** Build the artifact. */
export async function build({ site = 'main', root = ROOT, dir = FIXTURES_DIR } = {}) {
	const ctx = await buildContext(site, root);
	const fixtures = readFixtures(dir);
	const entries = fixtures.map((fixture) => {
		const { jsonLd, rendered } = harvest(fixture, ctx);
		return {
			fixture: fixture.file.replace(/\.md$/, ''),
			rune: fixture.rune,
			group: groupOf(fixture.rune) ?? null,
			notes: fixture.frontmatter.notes?.trim() ?? null,
			jsonLd,
			rendered,
		};
	});
	return {
		regenerateWith: REGENERATE_COMMAND,
		about:
			"Structured data every rune emits today, defects included (WORK-562 / SPEC-130). `jsonLd` is the pre-engine harvest `site.ts` publishes; `rendered` is the same tree after the identity transform. Object keys are sorted; array order is significant. Don't hand-edit — regenerate.",
		plugins: ctx.pluginNames,
		runeCount: allEmittingRunes().length,
		fixtureCount: entries.length,
		coverageGaps: coverageGaps(entries),
		fixtures: entries,
	};
}

/** Render the artifact exactly as it is committed. */
export function render(artifact) {
	return `${JSON.stringify(artifact, null, '\t')}\n`;
}

async function main() {
	const check = process.argv.includes('--check');
	const artifact = await build();
	const next = render(artifact);
	if (artifact.coverageGaps.length > 0) {
		console.error(
			`Runes with no fixture: ${artifact.coverageGaps.join(', ')}\n` +
				'Add a fixture under contracts/seo-baseline/fixtures/ for each.',
		);
		process.exit(1);
	}
	if (check) {
		const current = readFileSync(ARTIFACT_PATH, 'utf8');
		if (current !== next) {
			console.error(
				`contracts/seo-baseline/baseline.json is out of date.\nRun \`${REGENERATE_COMMAND}\` and review the diff — a change here is a change to what every site publishes.`,
			);
			process.exit(1);
		}
		console.log('✓ seo-baseline.json is up to date');
		return;
	}
	writeFileSync(ARTIFACT_PATH, next);
	console.log(
		`Wrote ${artifact.fixtureCount} fixtures covering ${artifact.runeCount} runes to contracts/seo-baseline/baseline.json`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
