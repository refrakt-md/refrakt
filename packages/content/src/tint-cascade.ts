import type { ContentDirectory, ContentPage } from './content-tree.js';
import { parseFrontmatter, type Frontmatter } from './frontmatter.js';

/**
 * The resolved tint cascade for a page — a deterministic three-field tuple
 * the renderer emits onto `<html>` as `data-*` attributes per SPEC-052.
 *
 *   - `tint` — named tint preset, or `null` (no named tint active)
 *   - `tintMode` — `'auto'` / `'light'` / `'dark'`. `'auto'` is the default;
 *     `'light'` and `'dark'` indicate an explicit mode preference.
 *   - `locked` — when `true`, the SSR-emitted mode is final: user
 *     preference is preserved in localStorage but not applied, and the
 *     theme-toggle UI hides.
 */
export interface ResolvedTintCascade {
	tint: string | null;
	tintMode: 'auto' | 'light' | 'dark';
	locked: boolean;
}

/**
 * Root defaults applied before any layout / page frontmatter contributes.
 * Adapters can pass `theme.colorScheme` from `refrakt.config.json` to seed
 * `tintMode`; everything else starts unset.
 */
export interface CascadeRootDefaults {
	/** Maps to {@link ResolvedTintCascade.tintMode}. */
	colorScheme?: 'auto' | 'light' | 'dark';
}

/**
 * Resolve the tint cascade for a page by walking its layout chain
 * outermost-to-innermost and overlaying its own frontmatter last.
 *
 * Cascade order (last writer wins per field):
 *
 *   1. Root defaults (typically from `theme.colorScheme` in site config)
 *   2. Each `_layout.md` from the root toward the page, in order
 *   3. The page's own frontmatter
 *
 * `undefined` at any level means "inherit from the next outer layer".
 * Explicit `null` for `tint` is the canonical "reset to no named tint"
 * idiom — preserved through the cascade so authors can break out of a
 * parent layout's tint without applying a new one.
 *
 * Pure function: given the same inputs, returns the same tuple. No I/O.
 */
export function resolveTintCascade(
	page: ContentPage,
	rootDir: ContentDirectory,
	defaults: CascadeRootDefaults = {},
): ResolvedTintCascade {
	const resolved: ResolvedTintCascade = {
		tint: null,
		tintMode: defaults.colorScheme ?? 'auto',
		locked: false,
	};

	const layoutChain = findLayoutChain(page, rootDir);
	for (const layoutPage of layoutChain) {
		const layoutFrontmatter = parseFrontmatter(layoutPage.raw).frontmatter;
		applyLayer(resolved, layoutFrontmatter);
	}

	const pageFrontmatter = parseFrontmatter(page.raw).frontmatter;
	applyLayer(resolved, pageFrontmatter);

	return resolved;
}

function applyLayer(resolved: ResolvedTintCascade, layer: Frontmatter): void {
	if ('tint' in layer && layer.tint !== undefined) {
		// `null` is a real value here — author's "reset to no named tint" idiom.
		resolved.tint = layer.tint as string | null;
	}
	if ('tint-mode' in layer && layer['tint-mode'] !== undefined) {
		const mode = layer['tint-mode'];
		if (mode === 'auto' || mode === 'light' || mode === 'dark') {
			resolved.tintMode = mode;
		}
	}
	if ('tint-lock' in layer && layer['tint-lock'] !== undefined) {
		resolved.locked = Boolean(layer['tint-lock']);
	}
}

/**
 * Walk from the root down to the page's directory, collecting every
 * `_layout.md` along the way. Returns the chain in outermost-to-innermost
 * order so the cascade can apply each in turn.
 *
 * Mirrors `layout.ts`'s `findLayoutChain` so the two stay in lockstep.
 */
function findLayoutChain(page: ContentPage, rootDir: ContentDirectory): ContentPage[] {
	const parts = page.relativePath.split('/').slice(0, -1);
	const chain: ContentPage[] = [];

	let current: ContentDirectory | undefined = rootDir;
	if (current.layout) chain.push(current.layout);

	for (const part of parts) {
		current = current.children.find(c => c.name === part);
		if (!current) break;
		if (current.layout) chain.push(current.layout);
	}

	return chain;
}
