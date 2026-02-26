import { RfContext } from './context.js';
import { SafeHTMLElement } from './ssr-safe.js';

/**
 * <rf-nav> — resolves page slugs to links with active state.
 *
 * Reads page data from RfContext.pages and current URL from RfContext.currentUrl.
 * Finds NavItem children (via [typeof="NavItem"]) and resolves their
 * data-slug attributes to page URLs.
 *
 * Progressive enhancement: without JS, shows plain text from identity transform.
 * With JS, replaces text with <a> links and marks the active page.
 */
export class RfNav extends SafeHTMLElement {
	connectedCallback() {
		this.resolveNavItems();
	}

	private resolveNavItems() {
		const pages = RfContext.pages;
		const currentUrl = RfContext.currentUrl;
		if (!pages || pages.length === 0) return;

		// Find all NavItem elements within this nav
		const items = this.querySelectorAll<HTMLElement>('[typeof="NavItem"]');
		for (const item of items) {
			const slug = item.dataset.slug;
			if (!slug) continue;

			const page = pages.find(p => p.url.endsWith('/' + slug) || p.url === '/' + slug);
			if (!page) continue;

			// Replace content with a link
			const link = document.createElement('a');
			link.href = page.url;
			link.className = 'rf-nav-item__link';
			link.textContent = page.title;

			if (currentUrl === page.url) {
				link.classList.add('rf-nav-item__link--active');
			}

			item.replaceChildren(link);
		}
	}
}
