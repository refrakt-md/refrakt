import type { Handle } from '@sveltejs/kit';
import {
	htmlTintAttributes,
	colorSchemeMetaContent,
	prePaintScript,
	type ResolvedTintCascade,
} from '@refrakt-md/content';

/**
 * Server-safe theme SSR plumbing for SvelteKit apps (SPEC-073).
 *
 * Imported from `@refrakt-md/sveltekit/hooks` (this entry deliberately avoids
 * the Vite plugin so it can run in the server runtime). Returns a SvelteKit
 * `Handle` that, per request, looks up the route's tint cascade and splices the
 * no-flash chrome into the response: tint `data-*` attributes on `<html>`, the
 * `color-scheme` meta, and the anti-FOIT pre-paint script — before any
 * stylesheet so the saved theme applies before first paint.
 *
 * Apps wire it in one line instead of hand-rolling the boilerplate:
 *
 * ```ts
 * // src/hooks.server.ts
 * import { createThemeHandle } from '@refrakt-md/sveltekit/hooks';
 * import { getSite } from '$lib/content';
 * export const handle = createThemeHandle(getSite);
 * ```
 *
 * Compose with other handles via SvelteKit's `sequence()` when needed.
 */
const DEFAULT_CASCADE: ResolvedTintCascade = {
	tint: null,
	tintMode: 'auto',
	locked: false,
};

/** Minimal shape this hook needs from the loaded Site (the real `getSite` from
 *  `virtual:refrakt/content` is structurally compatible). */
interface SiteLike {
	pages: Array<{ route: { url: string }; tintCascade?: ResolvedTintCascade }>;
	/** SPEC-035 — the site's configured locale (BCP 47); drives `<html lang>`. */
	locale?: string;
	config?: { locale?: string };
}

export function createThemeHandle(getSite: () => Promise<SiteLike>): Handle {
	const PRE_PAINT_SCRIPT = prePaintScript();

	/** Resolve a URL's cascade from the loaded Site's pages; a sensible default
	 *  for URLs that don't match (SvelteKit-internal routes, sitemap, etc.). */
	const cascadeForUrl = async (pathname: string): Promise<ResolvedTintCascade> => {
		try {
			const site = await getSite();
			const page = site.pages.find((p) => p.route.url === pathname);
			return page?.tintCascade ?? DEFAULT_CASCADE;
		} catch (_) {
			// Site load may fail during early bootstrap or in tests — fall back
			// to the safe default rather than crashing the response.
			return DEFAULT_CASCADE;
		}
	};

	/** SPEC-035 Zone 8 — the configured document locale, read once (defensively)
	 *  from the loaded Site; defaults to `'en'`. */
	const localeForSite = async (): Promise<string> => {
		try {
			const site = await getSite();
			return site.locale ?? site.config?.locale ?? 'en';
		} catch (_) {
			return 'en';
		}
	};

	return async ({ event, resolve }) => {
		const cascade = await cascadeForUrl(event.url.pathname);
		const htmlAttrs = htmlTintAttributes(cascade);
		const metaScheme = colorSchemeMetaContent(cascade);
		const lang = await localeForSite();

		return resolve(event, {
			transformPageChunk: ({ html }) => {
				let result = html;
				// Splice the cascade attrs inside the opening <html lang> tag and set
				// the configured locale (SPEC-035 Zone 8). The app-shell ships
				// `<html lang="en">`; rewrite the value + append tint attrs in one pass.
				const openTag = `<html lang="${lang}"${htmlAttrs ? ` ${htmlAttrs}` : ''}>`;
				result = result.replace(/<html lang="en">/, openTag);
				// Pre-paint script + color-scheme meta just inside <head>, before
				// any stylesheet, so the saved theme applies before first paint.
				result = result.replace(
					/<head>/,
					`<head>\n\t\t<meta name="color-scheme" content="${metaScheme}" />\n\t\t<script>${PRE_PAINT_SCRIPT}</script>`,
				);
				return result;
			},
		});
	};
}
