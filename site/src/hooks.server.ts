import type { Handle } from '@sveltejs/kit';
import {
	htmlTintAttributes,
	colorSchemeMetaContent,
	prePaintScript,
	type ResolvedTintCascade,
} from '@refrakt-md/content';
import { getSite } from '$lib/content';

const DEFAULT_CASCADE: ResolvedTintCascade = {
	tint: null,
	tintMode: 'auto',
	locked: false,
};

/** Look up the tint cascade for a request URL by matching it against the
 *  loaded Site's pages. Returns the page's precomputed cascade, or a sensible
 *  default for URLs that don't match (SvelteKit-internal routes, sitemap,
 *  llms.txt, etc.). */
async function cascadeForUrl(pathname: string): Promise<ResolvedTintCascade> {
	try {
		const site = await getSite();
		const page = site.pages.find(p => p.route.url === pathname);
		return page?.tintCascade ?? DEFAULT_CASCADE;
	} catch (_) {
		// Site load may fail during early bootstrap or in tests — fall back
		// to the safe default rather than crashing the response.
		return DEFAULT_CASCADE;
	}
}

const PRE_PAINT_SCRIPT = prePaintScript();

export const handle: Handle = async ({ event, resolve }) => {
	const cascade = await cascadeForUrl(event.url.pathname);
	const htmlAttrs = htmlTintAttributes(cascade);
	const metaScheme = colorSchemeMetaContent(cascade);

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			let result = html;

			// 1. Inject data-* attributes on <html>. The app.html has
			//    `<html lang="en">` literally; we splice the cascade attrs
			//    inside the opening tag.
			if (htmlAttrs) {
				result = result.replace(/<html lang="en">/, `<html lang="en" ${htmlAttrs}>`);
			}

			// 2. Inject the anti-FOIT pre-paint script and the
			//    <meta name="color-scheme"> just inside <head>, before any
			//    stylesheets — the script needs to run before paint to avoid
			//    a flash on unlocked pages, and color-scheme tells the browser
			//    which scrollbar / form-control colour scheme to use.
			result = result.replace(
				/<head>/,
				`<head>\n\t\t<meta name="color-scheme" content="${metaScheme}" />\n\t\t<script>${PRE_PAINT_SCRIPT}</script>`,
			);

			return result;
		},
	});
};
