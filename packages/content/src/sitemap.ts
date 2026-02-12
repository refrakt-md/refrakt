// ─── Sitemap XML Generation ───

export interface SitemapEntry {
	url: string;
	draft: boolean;
}

/**
 * Generate a sitemap.xml string from a list of pages.
 * Draft pages are excluded. Priority is assigned by URL depth.
 */
export function generateSitemap(pages: SitemapEntry[], baseUrl: string): string {
	const urls = pages
		.filter(p => !p.draft)
		.map(p => {
			const loc = `${baseUrl.replace(/\/$/, '')}${p.url}`;
			const depth = p.url === '/' ? 0 : p.url.split('/').filter(Boolean).length;
			const priority = depth === 0 ? '1.0' : depth <= 1 ? '0.8' : '0.6';
			return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <priority>${priority}</priority>\n  </url>`;
		});

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

function escapeXml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
