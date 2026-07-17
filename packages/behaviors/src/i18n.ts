/**
 * SPEC-035 Zone 5 — client-side behavior string localization.
 *
 * Behaviors run in the browser with no access to server config, so translations
 * are delivered **inline** (Decision D4), never fetched:
 *
 *  - `<meta name="rf-locale" content="de">` names the active locale.
 *  - `<script type="application/json" id="rf-strings">{…}</script>` carries the
 *    active-locale values for the `behavior.*` keys this page needs.
 *
 * Resolution per string is: **element `data-i18n-*` attribute → inline JSON
 * block → hardcoded English default**. Because the block is inline, strings are
 * available synchronously at behavior init — no flash-of-English, and a no-JS /
 * SSR-only page keeps the server-rendered English. When no locale is configured
 * the block is absent and everything falls to the English defaults below, so
 * output is unchanged.
 */

/** Canonical English defaults for every behavior string, keyed by
 *  `behavior.{file}.{name}`. The universal floor: an untranslated (or missing)
 *  key always resolves to English here. */
export const BEHAVIOR_STRINGS: Record<string, string> = {
	// copy.ts
	'behavior.copy.copy': 'Copy code',
	'behavior.copy.copied': 'Copied',
	// gallery.ts
	'behavior.gallery.lightbox': 'Image lightbox',
	'behavior.gallery.close': 'Close lightbox',
	'behavior.gallery.previous': 'Previous image',
	'behavior.gallery.next': 'Next image',
	'behavior.gallery.viewImage': 'View image {n}',
	// preview.ts
	'behavior.preview.preview': 'Preview',
	'behavior.preview.viewSource': 'View source',
	'behavior.preview.auto': 'Auto',
	'behavior.preview.light': 'Light',
	'behavior.preview.dark': 'Dark',
	'behavior.preview.systemPreference': 'System preference',
	'behavior.preview.lightMode': 'Light mode',
	'behavior.preview.darkMode': 'Dark mode',
	'behavior.preview.markdoc': 'Markdoc',
	'behavior.preview.rune': 'Rune',
	'behavior.preview.html': 'HTML',
	// reveal.ts
	'behavior.reveal.continue': 'Continue',
	'behavior.reveal.startOver': 'Start over',
	// search.ts
	'behavior.search.placeholder': 'Search documentation...',
	'behavior.search.noResults': 'No results found.',
	'behavior.search.unavailable': 'Search is not available.',
	'behavior.search.toNavigate': 'to navigate',
	'behavior.search.toSelect': 'to select',
	'behavior.search.esc': 'Esc',
	// datatable.ts
	'behavior.datatable.filter': 'Filter rows...',
	'behavior.datatable.prev': 'Prev',
	'behavior.datatable.next': 'Next',
	// form.ts
	'behavior.form.submitting': 'Submitting...',
	'behavior.form.success': 'Form submitted successfully.',
	'behavior.form.error': 'Something went wrong. Please try again.',
	'behavior.form.selectOption': 'Select an option',
	// juxtapose.ts
	'behavior.juxtapose.slider': 'Comparison slider',
	'behavior.juxtapose.toggle': 'Comparison toggle',
	'behavior.juxtapose.panel': 'Panel {n}',
	// carousel.ts
	'behavior.carousel.previous': 'Previous',
	'behavior.carousel.next': 'Next',
	// mobile-menu.ts
	'behavior.mobileMenu.open': 'Open menu',
	'behavior.mobileMenu.close': 'Close menu',
	// section-nav.ts / scrollspy.ts
	'behavior.sectionNav.pageSections': 'Page sections',
	// elements/audio.ts
	'behavior.audio.play': 'Play',
	'behavior.audio.pause': 'Pause',
	'behavior.audio.seek': 'Seek',
	// elements/sandbox.ts
	'behavior.sandbox.content': 'Sandboxed user content',
	// elements/map.ts
	'behavior.map.moreInfo': 'More info',
};

/** All behavior string keys — used by the server-side delivery to know which
 *  `behavior.*` keys to include in the inline block. */
export const BEHAVIOR_STRING_KEYS = Object.keys(BEHAVIOR_STRINGS);

let blockCache: Record<string, string> | null | undefined;

/** Parse and cache the inline `#rf-strings` JSON block once. Returns an empty
 *  object when the block is absent, empty, or malformed (→ English fallback). */
function readBlock(): Record<string, string> {
	if (blockCache !== undefined) return blockCache ?? {};
	blockCache = null;
	if (typeof document === 'undefined') return {};
	const el = document.getElementById('rf-strings');
	if (!el || !el.textContent) return {};
	try {
		const parsed = JSON.parse(el.textContent);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			blockCache = parsed as Record<string, string>;
		}
	} catch {
		// Malformed block → English fallback.
	}
	return blockCache ?? {};
}

/** Interpolate the `{n}` placeholder. */
function interp(template: string, n?: number | string): string {
	return n === undefined ? template : template.replace(/\{n\}/g, String(n));
}

/**
 * Resolve a runtime-created behavior string: inline block → English default.
 * `n` interpolates the `{n}` placeholder (gallery/juxtapose numbering).
 */
export function bstr(key: string, n?: number | string): string {
	const value = readBlock()[key] ?? BEHAVIOR_STRINGS[key] ?? key;
	return interp(value, n);
}

/**
 * Resolve an element-attached behavior string: element `data-i18n-*` attribute
 * → inline block → English default (Decision D4). `attr` is the full attribute
 * name (e.g. `data-i18n-copy`).
 */
export function elStr(el: Element | null, attr: string, key: string, n?: number | string): string {
	const fromEl = el?.getAttribute(attr);
	if (fromEl != null) return interp(fromEl, n);
	return bstr(key, n);
}

/** Test-only: reset the parse cache so a fresh `#rf-strings` block is read. */
export function __resetBehaviorStringCache(): void {
	blockCache = undefined;
}
