export interface PageParams {
	slug?: string[];
}

/**
 * Build the URL path from Next.js catch-all route params.
 *
 * Maps Next.js dynamic route segments back to a refrakt URL:
 *   { slug: ['docs', 'getting-started'] } → '/docs/getting-started'
 *   { slug: undefined }                   → '/'
 *   { slug: [] }                          → '/'
 */
export function buildUrlFromParams(params: PageParams): string {
	if (!params.slug || params.slug.length === 0) return '/';
	return '/' + params.slug.join('/');
}
