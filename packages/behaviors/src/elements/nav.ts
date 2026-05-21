import { SafeHTMLElement } from './ssr-safe.js';

/**
 * <rf-nav> — interactive-behavior anchor for the nav rune.
 *
 * As of SPEC-055, slug → href resolution and active-state marking are both
 * performed at build time during the cross-page pipeline's postProcess phase.
 * The SSR HTML carries resolved `<a href>` values with `aria-current="page"` /
 * `data-active="ancestor"` attributes already in place.
 *
 * This element therefore has no runtime resolution responsibilities. It remains
 * registered as a custom element so other behaviors (collapsible toggling,
 * menubar dropdown open/close, mega panel open/close) can attach to it.
 */
export class RfNav extends SafeHTMLElement {
	connectedCallback() {
		// Reserved for interactive-behavior hooks. No work to do for SSR-resolved navs.
	}
}
