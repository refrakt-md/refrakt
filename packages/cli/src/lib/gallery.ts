import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Recursively inline `@import './x.css';` statements into a single CSS string so
 * the gallery is self-contained (no path/serving concerns, deterministic for
 * screenshots). Only *relative* imports are inlined; any `url(...)`/remote
 * import is left untouched. A `seen` set guards against import cycles.
 */
export function flattenCssImports(entryPath: string, seen: Set<string> = new Set()): string {
	const abs = resolve(entryPath);
	if (seen.has(abs)) return '';
	seen.add(abs);

	const dir = dirname(abs);
	const css = readFileSync(abs, 'utf-8');

	return css.replace(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g, (match, importPath: string) => {
		if (!importPath.startsWith('.')) return match; // leave remote imports as-is
		return flattenCssImports(resolve(dir, importPath), seen);
	});
}

/** One rendered rune variant in the gallery. */
export interface GalleryCell {
	/** Rune name (e.g. `hint`). */
	rune: string;
	/** Variant key (e.g. `default`, `type-warning`). */
	variant: string;
	/** Rendered HTML for this variant. */
	html: string;
}

export interface GalleryDocumentOptions {
	mode: 'light' | 'dark';
	/** Flattened, self-contained theme CSS. */
	themeCss: string;
	cells: GalleryCell[];
	/** Optional override for the font `<link>` tags injected into `<head>`. */
	fontLinks?: string;
	/** Optional bundled behaviors IIFE, inlined before `</body>` so interactive /
	 *  lifecycle runes (tabs, diagram, chart, nav) enhance/render. */
	behaviorScript?: string;
}

/** Default web-font links — tactically Lumina's families (WORK-407 defers the
 *  theme-owned-font system). The harness needs fonts actually loaded for stable
 *  screenshots. */
const DEFAULT_FONT_LINKS = [
	'<link rel="preconnect" href="https://fonts.googleapis.com">',
	'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
	'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">',
].join('\n');

/** Gallery chrome + determinism CSS. Kills animation/transition/caret so
 *  screenshots are stable; lays out runes in labelled cells. */
const GALLERY_CSS = `
*, *::before, *::after {
	animation-duration: 0s !important;
	animation-delay: 0s !important;
	transition-duration: 0s !important;
	transition-delay: 0s !important;
	caret-color: transparent !important;
	scroll-behavior: auto !important;
}
body.rf-gallery {
	background: var(--rf-color-bg);
	color: var(--rf-color-text);
	font-family: var(--rf-font-sans, sans-serif);
	margin: 0;
	padding: 2.5rem 1.5rem;
}
.rf-gallery__inner { max-width: 72rem; margin: 0 auto; }
.rf-gallery__rune { margin: 0 0 3.5rem; }
.rf-gallery__rune-title {
	font-family: var(--rf-font-mono, monospace);
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--rf-color-muted, #888);
	border-bottom: 1px solid var(--rf-color-border, #ddd);
	padding-bottom: 0.5rem;
	margin: 0 0 1.5rem;
}
.rf-gallery__cell { margin: 0 0 2rem; }
.rf-gallery__gap {
	font-family: var(--rf-font-mono, monospace);
	font-size: 0.75rem;
	color: var(--rf-color-muted, #999);
	border: 1px dashed var(--rf-color-border, #ccc);
	border-radius: var(--rf-radius-sm, 4px);
	padding: 0.75rem 1rem;
}
.rf-gallery__cell-label {
	display: block;
	font-family: var(--rf-font-mono, monospace);
	font-size: 0.6875rem;
	color: var(--rf-color-muted, #999);
	margin: 0 0 0.5rem;
}
`.trim();

/** Determinism reset for layout fixtures (no gallery chrome — the layout *is*
 *  the page). Kills animation/transition/caret so screenshots are stable. */
const LAYOUT_RESET_CSS = `
*, *::before, *::after {
	animation-duration: 0s !important;
	animation-delay: 0s !important;
	transition-duration: 0s !important;
	transition-delay: 0s !important;
	caret-color: transparent !important;
	scroll-behavior: auto !important;
}
body { margin: 0; background: var(--rf-color-bg); color: var(--rf-color-text); font-family: var(--rf-font-sans, sans-serif); }
`.trim();

export interface LayoutDocumentOptions {
	mode: 'light' | 'dark';
	themeCss: string;
	/** The layout's rendered HTML (from `layoutTransform` → `renderToHtml`). */
	bodyHtml: string;
	/** Layout name, for the document title. */
	name: string;
	fontLinks?: string;
	behaviorScript?: string;
}

/**
 * Render a standalone full-page document for a layout fixture — the layout's
 * own chrome *is* the page (no gallery cell grid), so the harness can shoot it
 * whole-page at multiple viewports.
 */
export function renderLayoutDocument(opts: LayoutDocumentOptions): string {
	const { mode, themeCss, bodyHtml, name, fontLinks = DEFAULT_FONT_LINKS, behaviorScript } = opts;
	const htmlAttr = mode === 'dark' ? ' data-theme="dark"' : '';
	const tail = behaviorScript
		? `<script type="application/json" id="rf-context">{"pages":[],"currentUrl":"/"}</script>\n<script>${behaviorScript}</script>\n`
		: '';
	return `<!DOCTYPE html>
<html lang="en"${htmlAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>refrakt layout — ${name} (${mode})</title>
${fontLinks}
<style>${themeCss}</style>
<style>${LAYOUT_RESET_CSS}</style>
</head>
<body>
${bodyHtml}
${tail}</body>
</html>
`;
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render the full self-contained gallery HTML document for one mode. Cells are
 * grouped by rune; each carries a stable `data-gallery-cell="<rune>--<variant>"`
 * anchor so the harness ({% WORK-409 %}) can clip per variant.
 */
export function renderGalleryDocument(opts: GalleryDocumentOptions): string {
	const { mode, themeCss, cells, fontLinks = DEFAULT_FONT_LINKS, behaviorScript } = opts;

	// Group cells by rune, preserving insertion order.
	const byRune = new Map<string, GalleryCell[]>();
	for (const cell of cells) {
		const list = byRune.get(cell.rune) ?? [];
		list.push(cell);
		byRune.set(cell.rune, list);
	}

	const sections: string[] = [];
	for (const [rune, runeCells] of byRune) {
		const cellHtml = runeCells.map(cell => {
			const anchor = `${cell.rune}--${cell.variant}`;
			return `      <div class="rf-gallery__cell" data-gallery-cell="${escapeHtml(anchor)}" data-rune="${escapeHtml(cell.rune)}" data-variant="${escapeHtml(cell.variant)}">
        <span class="rf-gallery__cell-label">${escapeHtml(cell.variant)}</span>
${cell.html}
      </div>`;
		}).join('\n');
		sections.push(`    <section class="rf-gallery__rune" data-gallery-rune="${escapeHtml(rune)}">
      <h2 class="rf-gallery__rune-title">${escapeHtml(rune)}</h2>
${cellHtml}
    </section>`);
	}

	const htmlAttr = mode === 'dark' ? ' data-theme="dark"' : '';

	return `<!DOCTYPE html>
<html lang="en"${htmlAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>refrakt gallery (${mode})</title>
${fontLinks}
<style>${themeCss}</style>
<style>${GALLERY_CSS}</style>
</head>
<body class="rf-gallery">
<div class="rf-gallery__inner">
${sections.join('\n')}
</div>
${behaviorScript ? `<script type="application/json" id="rf-context">{"pages":[],"currentUrl":"/"}</script>\n<script>${behaviorScript}</script>\n` : ''}</body>
</html>
`;
}
