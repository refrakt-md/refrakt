import Markdoc from '@markdoc/markdoc';
import type { Config } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { resolveIcon } from './icon-resolve.js';
import { placeholderSvg, DEFAULT_PLACEHOLDER_SHAPE, PLACEHOLDER_SHAPES } from './placeholder.js';

export interface ImageSchemeContext {
	/** Image `alt` — used as the accessible label by resolvers. */
	alt?: string;
	/** Image `title`, if any. */
	title?: string;
	/** RDFa `property`; the caller forwards it as `data-field`. */
	property?: string;
	/** Active Markdoc config (the icon registry lives on `variables.__icons`). */
	config: Config;
}

export type ImageSchemeResolver = (
	arg: string,
	ctx: ImageSchemeContext,
) => InstanceType<typeof Tag> | null;

const registry = new Map<string, ImageSchemeResolver>();

/**
 * Register a resolver for a custom image-`src` scheme (e.g. `icon`,
 * `placeholder`). Plugins may register their own. Last registration wins.
 */
export function registerImageScheme(scheme: string, resolver: ImageSchemeResolver): void {
	registry.set(scheme.toLowerCase(), resolver);
}

/** True when `scheme` has a registered resolver. */
export function hasImageScheme(scheme: string): boolean {
	return registry.has(scheme.toLowerCase());
}

// scheme = leading run before the first colon, per the URI generic syntax.
// Matches `placeholder:portrait`, `icon:github`, `https://…`, `data:…`; the
// `s` flag lets the argument span newlines defensively. Bare paths (no colon)
// and relative paths never match → they fall through to the <img> path.
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/s;

/**
 * Resolve a `scheme:arg` image src to a renderable Tag via the registry.
 * Returns null for bare paths, absolute URLs, and unregistered schemes — the
 * caller then falls through to the normal `<img>` path unchanged.
 */
export function resolveImageScheme(
	src: string,
	ctx: ImageSchemeContext,
): InstanceType<typeof Tag> | null {
	const match = SCHEME_RE.exec(src);
	if (!match) return null;
	const resolver = registry.get(match[1].toLowerCase());
	if (!resolver) return null;
	return resolver(match[2], ctx);
}

// ── Core schemes ────────────────────────────────────────────────────────────

// `icon:<name>` — inline the theme icon set's SVG (shares the `{% icon %}`
// rune's source). `alt` becomes the accessible label; unknown names warn (dev)
// and fall back to the icon resolver's graceful <span>.
registerImageScheme('icon', (name, ctx) => {
	const { tag, found } = resolveIcon(name, ctx.config, { label: ctx.alt });
	if (!found) {
		console.warn(`[refrakt] icon: unknown icon name "${name}" — falling back to a neutral glyph.`);
	}
	return tag;
});

// `placeholder:<shape>` — deterministic, token-tinted generated SVG. Unknown
// shapes warn (dev) and fall back to `cover`.
registerImageScheme('placeholder', (shape, ctx) => {
	if (shape && !PLACEHOLDER_SHAPES.includes(shape)) {
		console.warn(
			`[refrakt] placeholder: unknown shape "${shape}" — falling back to "${DEFAULT_PLACEHOLDER_SHAPE}". `
			+ `Known shapes: ${PLACEHOLDER_SHAPES.join(', ')}.`,
		);
	}
	return placeholderSvg(shape, { label: ctx.alt });
});
