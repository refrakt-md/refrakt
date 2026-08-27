import type { SerializedTag } from '@refrakt-md/types';
import type { FacetStyle } from './types.js';

/** A resolved chrome bundle: what to put on the surface it decorates.
 *
 *  Shared by `frame` (SPEC-086) and `substrate` (SPEC-087), which both resolve
 *  early against the rune tag but apply late, to a surface chosen at resolve
 *  time — the rune root, or the `[data-section="media"]` zone that does not
 *  exist until the children are assembled. */
export interface Chrome {
	dataAttrs: Record<string, string>;
	styles: FacetStyle[];
	/** Meta fields the chrome consumed, whether or not it ends up applied. */
	consumes: string[];
}

/** Which surface a chrome bundle decorates. `null` means "nowhere" — the metas
 *  are still consumed so they cannot leak to output, but nothing is applied. */
export type ChromeTarget = 'self' | 'media' | null;

/** What `resolve` hands its own `postAssemble` when the target is the media
 *  zone, which only exists in the second phase. */
export interface ChromeCarry {
	chrome: Chrome;
	target: ChromeTarget;
}

/** Merge chrome onto a tag in place, appending to any existing inline style. */
export function applyChromeToTag(tag: SerializedTag, chrome: Chrome): void {
	tag.attributes = { ...tag.attributes, ...chrome.dataAttrs };
	if (chrome.styles.length) {
		const declarations = chrome.styles.map(([prop, value]) => `${prop}: ${value}`).join('; ');
		const existing = tag.attributes.style ? String(tag.attributes.style) : '';
		tag.attributes.style = existing ? `${existing}; ${declarations}` : declarations;
	}
}

/** Does this rune declare a media section for chrome to land on? */
export function hasMediaSection(sections: Record<string, string> | undefined): boolean {
	return sections ? Object.values(sections).includes('media') : false;
}
