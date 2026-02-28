import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { LayoutPageData } from './types.js';
import { isTag, makeTag } from './helpers.js';

// ─── Helpers (private) ────────────────────────────────────────────────

/** Recursively extract text content from a serialized tag tree */
function getTextContent(node: RendererNode): string {
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);
	if (isTag(node)) return node.children.map(getTextContent).join('');
	if (Array.isArray(node)) return node.map(getTextContent).join('');
	return '';
}

/**
 * Build a map of page slug → nav group title from nav region content.
 * Walks the serialized NavGroup/NavItem tree structure.
 */
function buildNavMap(content: RendererNode[]): Map<string, string> {
	const map = new Map<string, string>();

	function walk(nodes: RendererNode[], groupTitle: string) {
		for (const node of nodes) {
			if (!isTag(node)) continue;
			if (node.attributes.typeof === 'NavGroup') {
				const heading = node.children.find(
					(c): c is SerializedTag => isTag(c) && /^h[1-6]$/.test(c.name)
				);
				walk(node.children, heading ? getTextContent(heading) : '');
			} else if (node.attributes.typeof === 'NavItem') {
				const slugSpan = node.children.find(
					(c): c is SerializedTag =>
						isTag(c) && c.name === 'span' && c.attributes.property === 'slug'
				);
				if (slugSpan && groupTitle) {
					map.set(getTextContent(slugSpan), groupTitle);
				}
			} else if (node.children) {
				walk(node.children, groupTitle);
			}
		}
	}

	walk(content, '');
	return map;
}

/**
 * Collect ordered page slugs from nav tree (for prev/next navigation).
 * Returns slugs in the order they appear in the nav.
 */
function collectNavOrder(content: RendererNode[]): string[] {
	const slugs: string[] = [];

	function walk(nodes: RendererNode[]) {
		for (const node of nodes) {
			if (!isTag(node)) continue;
			if (node.attributes.typeof === 'NavItem') {
				const slugSpan = node.children.find(
					(c): c is SerializedTag =>
						isTag(c) && c.name === 'span' && c.attributes.property === 'slug'
				);
				if (slugSpan) {
					slugs.push(getTextContent(slugSpan));
				}
			} else if (node.children) {
				walk(node.children);
			}
		}
	}

	walk(content);
	return slugs;
}

// ─── Computed Content Builders ────────────────────────────────────────

/**
 * Build breadcrumb from nav region content.
 * Walks the nav tree to find the current page's group title.
 *
 * Emits:
 * ```html
 * <div class="rf-docs-toolbar__breadcrumb">
 *   <span class="rf-docs-breadcrumb-category">Group</span>
 *   <span class="rf-docs-breadcrumb-sep">›</span>
 *   <span class="rf-docs-breadcrumb-page">Page Title</span>
 * </div>
 * ```
 */
export function buildBreadcrumb(
	navContent: RendererNode[],
	currentUrl: string,
	pageTitle: string,
	prefix: string,
): SerializedTag | null {
	const navMap = buildNavMap(navContent);
	const pageSlug = (currentUrl || '').split('/').filter(Boolean).pop() || '';
	const category = navMap.get(pageSlug);

	if (!category) return null;

	return makeTag('div', { class: `${prefix}-docs-toolbar__breadcrumb` }, [
		makeTag('span', { class: `${prefix}-docs-breadcrumb-category` }, [category]),
		makeTag('span', { class: `${prefix}-docs-breadcrumb-sep` }, ['\u203A']),
		makeTag('span', { class: `${prefix}-docs-breadcrumb-page` }, [pageTitle]),
	]);
}

/**
 * Build table of contents from page headings.
 *
 * Emits:
 * ```html
 * <nav class="rf-on-this-page" data-scrollspy>
 *   <p class="rf-on-this-page__title">On this page</p>
 *   <ul class="rf-on-this-page__list">
 *     <li class="rf-on-this-page__item" data-level="2">
 *       <a href="#id">Heading text</a>
 *     </li>
 *   </ul>
 * </nav>
 * ```
 */
export function buildToc(
	headings: Array<{ level: number; text: string; id: string }>,
	prefix: string,
	options?: { minLevel?: number; maxLevel?: number },
): SerializedTag | null {
	const minLevel = options?.minLevel ?? 2;
	const maxLevel = options?.maxLevel ?? 3;
	const filtered = headings.filter(h => h.level >= minLevel && h.level <= maxLevel);

	if (filtered.length === 0) return null;

	const items = filtered.map(h =>
		makeTag('li', {
			class: `${prefix}-on-this-page__item`,
			'data-level': String(h.level),
		}, [
			makeTag('a', { href: `#${h.id}` }, [h.text]),
		])
	);

	return makeTag('nav', {
		class: `${prefix}-on-this-page`,
		'data-scrollspy': '',
	}, [
		makeTag('p', { class: `${prefix}-on-this-page__title` }, ['On this page']),
		makeTag('ul', { class: `${prefix}-on-this-page__list` }, items),
	]);
}

/**
 * Build prev/next navigation from nav tree.
 * Finds the current page's neighbors in the nav ordering.
 *
 * Emits:
 * ```html
 * <nav class="rf-prev-next">
 *   <a class="rf-prev-next__prev" href="/prev-url">
 *     <span class="rf-prev-next__label">Previous</span>
 *     <span class="rf-prev-next__title">Page Title</span>
 *   </a>
 *   <a class="rf-prev-next__next" href="/next-url">
 *     <span class="rf-prev-next__label">Next</span>
 *     <span class="rf-prev-next__title">Page Title</span>
 *   </a>
 * </nav>
 * ```
 */
export function buildPrevNext(
	navContent: RendererNode[],
	currentUrl: string,
	pages: LayoutPageData['pages'],
	prefix: string,
): SerializedTag | null {
	const slugs = collectNavOrder(navContent);
	const currentSlug = (currentUrl || '').split('/').filter(Boolean).pop() || '';
	const currentIndex = slugs.indexOf(currentSlug);

	if (currentIndex === -1) return null;

	function findPage(slug: string) {
		return pages.find(p => p.url.endsWith('/' + slug) || p.url === '/' + slug);
	}

	const prevSlug = currentIndex > 0 ? slugs[currentIndex - 1] : null;
	const nextSlug = currentIndex < slugs.length - 1 ? slugs[currentIndex + 1] : null;
	const prevPage = prevSlug ? findPage(prevSlug) : null;
	const nextPage = nextSlug ? findPage(nextSlug) : null;

	if (!prevPage && !nextPage) return null;

	const children: RendererNode[] = [];

	if (prevPage) {
		children.push(makeTag('a', {
			class: `${prefix}-prev-next__prev`,
			href: prevPage.url,
		}, [
			makeTag('span', { class: `${prefix}-prev-next__label` }, ['Previous']),
			makeTag('span', { class: `${prefix}-prev-next__title` }, [prevPage.title]),
		]));
	}

	if (nextPage) {
		children.push(makeTag('a', {
			class: `${prefix}-prev-next__next`,
			href: nextPage.url,
		}, [
			makeTag('span', { class: `${prefix}-prev-next__label` }, ['Next']),
			makeTag('span', { class: `${prefix}-prev-next__title` }, [nextPage.title]),
		]));
	}

	return makeTag('nav', { class: `${prefix}-prev-next` }, children);
}

/**
 * Build version switcher from page frontmatter.
 * Finds peer pages with the same versionGroup and builds a <select> dropdown.
 *
 * Emits:
 * ```html
 * <nav class="rf-version-switcher" data-version-switcher>
 *   <label class="rf-version-switcher__label">Version</label>
 *   <select class="rf-version-switcher__select">
 *     <option value="/docs/v1/getting-started">1.0</option>
 *     <option value="/docs/v2/getting-started" selected>2.0</option>
 *   </select>
 * </nav>
 * ```
 */
export function buildVersionSwitcher(
	currentUrl: string,
	pages: LayoutPageData['pages'],
	frontmatter: Record<string, unknown>,
	prefix: string,
): SerializedTag | null {
	const version = frontmatter.version as string | undefined;
	const versionGroup = frontmatter.versionGroup as string | undefined;

	if (!version || !versionGroup) return null;

	// Find peer pages: same versionGroup, not drafts
	const peers = pages.filter(p => p.versionGroup === versionGroup && !p.draft);

	// Need at least 2 versions (current + at least one other)
	if (peers.length < 2) return null;

	// Sort by version using natural string comparison
	const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
	const sorted = [...peers].sort((a, b) => collator.compare(a.version ?? '', b.version ?? ''));

	const options = sorted.map(p => {
		const attrs: Record<string, any> = { value: p.url };
		if (p.url === currentUrl) {
			attrs.selected = '';
		}
		return makeTag('option', attrs, [p.version ?? '']);
	});

	return makeTag('nav', {
		class: `${prefix}-version-switcher`,
		'data-version-switcher': '',
	}, [
		makeTag('label', { class: `${prefix}-version-switcher__label` }, ['Version']),
		makeTag('select', { class: `${prefix}-version-switcher__select` }, options),
	]);
}
