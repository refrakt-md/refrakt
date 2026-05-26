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

async function cascadeForUrl(pathname: string): Promise<ResolvedTintCascade> {
	try {
		const site = await getSite();
		const page = site.pages.find((p) => p.route.url === pathname);
		return page?.tintCascade ?? DEFAULT_CASCADE;
	} catch (_) {
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
			if (htmlAttrs) {
				result = result.replace(/<html lang="en">/, `<html lang="en" ${htmlAttrs}>`);
			}
			result = result.replace(
				/<head>/,
				`<head>\n\t\t<meta name="color-scheme" content="${metaScheme}" />\n\t\t<script>${PRE_PAINT_SCRIPT}</script>`,
			);
			return result;
		},
	});
};
