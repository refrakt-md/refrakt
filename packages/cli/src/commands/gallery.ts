import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Rune } from '@refrakt-md/runes';
import type { ThemeConfig } from '@refrakt-md/transform';
import { getFixture, hasFixture } from '../lib/fixtures.js';
import { discoverVariants } from '../lib/variants.js';
import { flattenCssImports, renderGalleryDocument, type GalleryCell } from '../lib/gallery.js';
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

	for (const rune of runes) {
		const runeConfig = rune.typeName ? config.runes[rune.typeName] : undefined;
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
		for (const { variant, flags } of variantMatrix(rune)) {
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

	mkdirSync(options.outDir, { recursive: true });
	const themeName = options.theme.replace(/^@[^/]+\//, '').replace(/[@/]/g, '-');

	for (const mode of ['light', 'dark'] as const) {
		const doc = renderGalleryDocument({ mode, themeCss, cells });
		const file = resolve(options.outDir, `${themeName}.${mode}.html`);
		writeFileSync(file, doc);
		console.log(`Wrote ${file}`);
	}

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
function renderCell(
	transform: (tree: any) => any,
	rune: Rune,
	flags: Record<string, string>,
	deps: InspectDeps,
): string {
	const source = deps.packageFixtures?.[rune.name] ?? getFixture(rune.name, flags);
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
	const tree = transform(serialized);
	return deps.renderToHtml(tree, { pretty: false });
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
