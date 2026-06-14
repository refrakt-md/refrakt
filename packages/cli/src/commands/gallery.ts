import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Rune } from '@refrakt-md/runes';
import type { ThemeConfig, RuneConfig, LayoutConfig, LayoutPageData } from '@refrakt-md/transform';
import { toKebabCase, layoutTransform, defaultLayout, docsLayout, blogArticleLayout, planLayout } from '@refrakt-md/transform';
import { getFixture, hasFixture } from '../lib/fixtures.js';
import { discoverVariants } from '../lib/variants.js';
import { flattenCssImports, renderGalleryDocument, renderLayoutDocument, type GalleryCell } from '../lib/gallery.js';
import type { InspectDeps } from './inspect.js';

export interface GalleryOptions {
	/** Theme package whose CSS is inlined (e.g. `@refrakt-md/lumina`). */
	theme: string;
	/** Output directory for the generated artifacts. */
	outDir: string;
}

/**
 * Generate the static rune gallery — every rune across its variant matrix,
 * rendered through the identity transform, into self-contained light/dark HTML.
 * Reuses the `inspect` pipeline (parse → transform → serialize → identity
 * transform → `renderToHtml`); the project's assembled config drives the render
 * (so plugin runes are covered) and `--theme`'s CSS is inlined.
 */
export async function galleryCommand(options: GalleryOptions, deps: InspectDeps): Promise<void> {
	const config = deps.baseConfig; // the assembled project config (core + plugins + theme)
	const transform = deps.createTransform(config);

	const cells: GalleryCell[] = [];
	const skipped: string[] = [];
	const missing: string[] = [];

	// Stable rune order for deterministic output.
	const runes = Object.values(deps.runes).sort((a, b) => a.name.localeCompare(b.name));

	// Resolve config the way the identity transform does: by kebab-casing the
	// config key to match the rune. Plugin runes have no `typeName` (loadPlugin
	// doesn't set one), so a typeName-only lookup drops every plugin rune
	// (BUG-002). The match is also looser than `name === kebab(key)` because a
	// rune's CLI name can differ from its `data-rune` / config key (e.g. `cta` →
	// `call-to-action`/`CallToAction`, `howto` → `how-to`/`HowTo`), so we try the
	// name, its aliases, and a separator-insensitive form.
	const configByRune = new Map<string, RuneConfig>();
	for (const [key, cfg] of Object.entries(config.runes)) {
		const kebab = toKebabCase(key);
		configByRune.set(kebab, cfg);
		configByRune.set(kebab.replace(/-/g, ''), cfg);
	}
	const resolveConfig = (rune: Rune): RuneConfig | undefined => {
		if (rune.typeName && config.runes[rune.typeName]) return config.runes[rune.typeName];
		const keys = [rune.name, ...(rune.aliases ?? [])].flatMap(k => [k, k.replace(/-/g, '')]);
		for (const k of keys) {
			const cfg = configByRune.get(k);
			if (cfg) return cfg;
		}
		return undefined;
	};

	for (const rune of runes) {
		const runeConfig = resolveConfig(rune);
		if (!runeConfig) continue; // component-only rune, no identity-transform config
		if (runeConfig.requiresParent) continue; // child rune — not standalone-renderable
		// Child runes declare a specific `parent` (e.g. budget-line-item → Budget);
		// they only make sense inside that parent's fixture. `parent: '*'` marks a
		// wrapper (bg/tint) that applies to anything — keep those.
		if (runeConfig.parent && runeConfig.parent !== '*') continue;

		// Runes with no real fixture get an honest gap marker, never the broken
		// stub. Once WORK-412's corpus is complete this list should be empty.
		if (!hasFixture(rune.name, deps.packageFixtures)) {
			cells.push({ rune: rune.name, variant: 'no-fixture', html: gapMarker(rune.name) });
			missing.push(rune.name);
			continue;
		}

		const seenHtml = new Set<string>();
		// A fixture that demonstrates several instances of the rune inline (e.g.
		// badge showing every sentiment in one sentence) can't be meaningfully
		// variant-expanded: attribute injection only rewrites the first tag,
		// producing redundant near-identical cells. Render those once.
		const baseSource = deps.packageFixtures?.[rune.name] ?? getFixture(rune.name, {});
		const ownTagCount = (baseSource.match(new RegExp(`\\{%\\s*${rune.name}\\b`, 'g')) ?? []).length;
		const matrix = ownTagCount > 1 ? [{ variant: 'default', flags: {} }] : variantMatrix(rune);
		for (const { variant, flags } of matrix) {
			try {
				const html = renderCell(transform, rune, flags, deps);
				if (seenHtml.has(html)) continue; // dedupe variants that render identically
				seenHtml.add(html);
				cells.push({ rune: rune.name, variant, html });
			} catch {
				skipped.push(`${rune.name}:${variant}`);
			}
		}
	}

	if (cells.length === 0) {
		throw new Error('No runes rendered — is a theme/plugin config available?');
	}

	const themeCss = loadThemeCss(options.theme);
	const behaviorScript = await bundleBehaviors();

	mkdirSync(options.outDir, { recursive: true });
	const themeName = options.theme.replace(/^@[^/]+\//, '').replace(/[@/]/g, '-');

	for (const mode of ['light', 'dark'] as const) {
		const doc = renderGalleryDocument({ mode, themeCss, cells, behaviorScript });
		const file = resolve(options.outDir, `${themeName}.${mode}.html`);
		writeFileSync(file, doc);
		console.log(`Wrote ${file}`);
	}

	// Layout fixtures — the second subject class. Each built-in LayoutConfig is
	// rendered over one synthetic multi-page context so the chrome (header, nav,
	// breadcrumb, TOC, sidebar, footer, prev/next) populates. Emitted as
	// standalone full-page documents (no gallery chrome) so the harness shoots
	// each whole-page at multiple viewports.
	const page = buildSyntheticPage(transform, deps);
	const layouts: Record<string, LayoutConfig> = {
		'default': defaultLayout,
		docs: docsLayout,
		'blog-article': blogArticleLayout,
		plan: planLayout,
	};
	for (const [name, layout] of Object.entries(layouts)) {
		let bodyHtml: string;
		try {
			const tree = layoutTransform(layout, { ...page, frontmatter: { ...page.frontmatter, layout: name } }, 'rf');
			bodyHtml = deps.renderToHtml(tree, { pretty: false });
		} catch (err) {
			console.warn(`Layout "${name}" skipped: ${(err as Error).message}`);
			continue;
		}
		for (const mode of ['light', 'dark'] as const) {
			const doc = renderLayoutDocument({ mode, themeCss, behaviorScript, name, bodyHtml });
			const file = resolve(options.outDir, `${themeName}.layout-${name}.${mode}.html`);
			writeFileSync(file, doc);
		}
	}
	console.log(`Layouts: ${Object.keys(layouts).length} fixtures (× light/dark).`);

	const runeCount = new Set(cells.map(c => c.rune)).size;
	console.log(`Gallery: ${runeCount} runes, ${cells.length} variant cells.`);
	if (missing.length > 0) {
		console.warn(`No fixture (gap marker shown) for ${missing.length}: ${missing.join(', ')}`);
	}
	if (skipped.length > 0) {
		const preview = skipped.slice(0, 12).join(', ');
		console.warn(`Skipped ${skipped.length} cell(s) that failed to render: ${preview}${skipped.length > 12 ? '…' : ''}`);
	}
}

/** Honest placeholder for a rune with no standalone preview — either no fixture
 *  yet, or a directive/registry/post-process rune that can't render outside the
 *  cross-page pipeline (e.g. `aggregate`, `collection`, `bg`). */
function gapMarker(rune: string): string {
	return `<div class="rf-gallery__gap"><code>${rune}</code> — no standalone gallery preview</div>`;
}

/** Cross-cutting surface-model axes (SPEC-086–090) inherited by nearly every
 *  rune. They are a theme dimension, not a rune's identity, and are showcased
 *  once in the surfaces docs — expanding them per-rune produces thousands of
 *  redundant cells, so the gallery omits them and shows each rune's *own*
 *  semantic variants. Matched by exact name or these prefixes. */
const UNIVERSAL_AXIS_PREFIXES = ['bg', 'substrate', 'frame', 'scrim', 'tint'];
const UNIVERSAL_AXES = new Set([
	'width', 'spacing', 'inset', 'elevation', 'density',
	'cover', 'media-position', 'posture', 'guest-posture',
]);

/** Cap on variant cells per rune, so a rune with a large own enum (e.g. icon
 *  names) doesn't dominate the gallery. */
const MAX_CELLS_PER_RUNE = 16;

function isUniversalAxis(attr: string): boolean {
	if (UNIVERSAL_AXES.has(attr)) return true;
	return UNIVERSAL_AXIS_PREFIXES.some(p => attr === p || attr.startsWith(`${p}-`));
}

/** The variant matrix for a rune: a base cell plus one per *own* enum modifier
 *  value (universal surface axes excluded), capped per rune. */
function variantMatrix(rune: Rune): { variant: string; flags: Record<string, string> }[] {
	const out: { variant: string; flags: Record<string, string> }[] = [{ variant: 'default', flags: {} }];
	const variants = discoverVariants(rune.schema);
	for (const [attr, values] of Object.entries(variants)) {
		if (isUniversalAxis(attr)) continue;
		for (const value of values) {
			out.push({ variant: `${attr}-${value}`, flags: { [attr]: value } });
		}
	}
	return out.slice(0, MAX_CELLS_PER_RUNE);
}

/** Run the parse → transform → serialize → identity-transform pipeline for one
 *  variant, returning rendered HTML. Mirrors `inspect`'s `runPipeline`. */
/** Run the parse → transform → serialize → identity-transform pipeline on a
 *  Markdoc source string, returning the rendered tree (pre-`renderToHtml`).
 *  Shared by rune cells and layout-fixture content/regions. */
function sourceToTree(source: string, transform: (tree: any) => any, deps: InspectDeps): any {
	const ast = deps.Markdoc.parse(source);
	const headings = deps.extractHeadings(ast);
	const transformed = deps.Markdoc.transform(ast, {
		tags: deps.tags,
		nodes: deps.nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: '/gallery.md',
			headings,
			__source: source,
			frontmatter: {},
			page: { url: '/gallery.md', filePath: 'gallery.md', draft: false },
		},
	});
	const serialized = deps.serializeTree(transformed);
	return transform(serialized);
}

function renderCell(
	transform: (tree: any) => any,
	rune: Rune,
	flags: Record<string, string>,
	deps: InspectDeps,
): string {
	const source = deps.packageFixtures?.[rune.name] ?? getFixture(rune.name, flags);
	return deps.renderToHtml(sourceToTree(source, transform, deps), { pretty: false });
}

/** A representative article body for layout fixtures — headings (for the TOC) +
 *  prose + a rune, so the reading column has real content. */
const LAYOUT_MAIN_SOURCE = `# Building a theme

A representative paragraph of body copy so the layout's reading column has real text
to flow — demonstrating measure, rhythm, and how chrome frames content.

## Getting started

{% hint type="note" %}
A note inside the article body, to show how a rune sits within page chrome.
{% /hint %}

Body copy under the first section, long enough to give the column some height.

## Configuration

A second section so the on-this-page table of contents has more than one entry.

## Deployment

Closing section with a final paragraph of copy.
`;

/** Build one synthetic multi-page context shared across all layout fixtures, so
 *  computed chrome (breadcrumb, TOC, nav tree, prev/next) and regions populate. */
function buildSyntheticPage(transform: (tree: any) => any, deps: InspectDeps): LayoutPageData {
	const tree = (src: string) => sourceToTree(src, transform, deps);
	const region = (name: string, src: string) => ({ name, mode: 'replace', content: [tree(src)] });

	return {
		renderable: tree(LAYOUT_MAIN_SOURCE),
		title: 'Building a theme',
		url: '/docs/building-a-theme',
		regions: {
			header: region('header', '[Docs](/docs) · [Blog](/blog) · [Reference](/docs/api)'),
			nav: region('nav', deps.packageFixtures?.nav ?? getFixture('nav')),
			footer: region('footer', 'Footer — [Docs](/docs) · [GitHub](https://github.com)'),
			sidebar: region('sidebar', '### Related\n- [Tokens](/docs/tokens)\n- [Layouts](/docs/layouts)'),
			pagination: region('pagination', deps.packageFixtures?.pagination ?? getFixture('pagination')),
		},
		pages: [
			{ url: '/docs/intro', title: 'Introduction', draft: false },
			{ url: '/docs/install', title: 'Installation', draft: false },
			{ url: '/docs/building-a-theme', title: 'Building a theme', draft: false },
			{ url: '/docs/configuration', title: 'Configuration', draft: false },
			{ url: '/docs/api', title: 'Reference', draft: false },
			{ url: '/blog/launch', title: 'Launch post', draft: false, date: '2026-01-15', author: 'Jane Doe' },
		],
		frontmatter: {
			title: 'Building a theme',
			description: 'A representative page exercising the layout chrome.',
			date: '2026-01-15',
			author: 'Jane Doe',
			tags: ['guide', 'theme'],
		},
		headings: [
			{ level: 1, text: 'Building a theme', id: 'building-a-theme' },
			{ level: 2, text: 'Getting started', id: 'getting-started' },
			{ level: 2, text: 'Configuration', id: 'configuration' },
			{ level: 2, text: 'Deployment', id: 'deployment' },
		],
	};
}

/**
 * Bundle the HTML adapter's `initPage` (which registers the rune web components
 * and wires behaviors) into a browser IIFE via esbuild, so interactive /
 * lifecycle runes (tabs, diagram, chart, nav) enhance/render when the gallery
 * is opened or screenshotted. Mirrors `create-refrakt`'s `template-html` client
 * bundle. Returns `undefined` (with a warning) if bundling isn't possible, so
 * the gallery degrades gracefully to its static form.
 */
async function bundleBehaviors(): Promise<string | undefined> {
	try {
		const esbuild = await import('esbuild');
		const entry = [
			"import { initPage } from '@refrakt-md/html/client';",
			'const run = () => { initPage(); };',
			"if (document.readyState !== 'loading') run();",
			"else document.addEventListener('DOMContentLoaded', run);",
		].join('\n');
		const result = await esbuild.build({
			stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
			bundle: true,
			format: 'iife',
			platform: 'browser',
			target: 'es2020',
			minify: true,
			write: false,
		});
		const out = result.outputFiles?.[0]?.text;
		if (!out) throw new Error('esbuild produced no output');
		return out;
	} catch (err) {
		console.warn(`Behaviors not bundled (gallery will be static): ${(err as Error).message}`);
		return undefined;
	}
}

/** Resolve and flatten the theme package's entry CSS into a self-contained
 *  string. Resolves the theme's `.` export (its CSS entry, per the theme
 *  package convention) from the project CWD, where the theme is installed. */
function loadThemeCss(themePackage: string): string {
	const require = createRequire(resolve(process.cwd(), 'noop.js'));
	let indexCss: string;
	try {
		indexCss = require.resolve(themePackage);
	} catch {
		throw new Error(`Could not resolve theme package "${themePackage}". Install it or pass --theme <package>.`);
	}
	try {
		return flattenCssImports(indexCss);
	} catch (err) {
		throw new Error(`Could not read theme CSS at ${indexCss}: ${(err as Error).message}`);
	}
}
