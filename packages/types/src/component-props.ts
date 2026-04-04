import type { SerializedTag } from './serialized.js';

/**
 * Base props for all rune component overrides (ADR-008).
 *
 * Every component override receives:
 * - `children` — anonymous content (not a property or named ref)
 * - `tag` — the original serialized tag for escape-hatch access
 *
 * @typeParam R — framework-specific renderable type (`Snippet` in Svelte 5, `ReactNode` in React, etc.)
 */
export interface BaseComponentProps<R = unknown> {
	children?: R;
	tag?: SerializedTag;
}

/**
 * Page section slots commonly provided by runes that use `pageSectionProperties`.
 *
 * @typeParam R — framework-specific renderable type
 */
export interface PageSectionSlots<R = unknown> {
	eyebrow?: R;
	headline?: R;
	blurb?: R;
	image?: R;
}

/**
 * Properties common to runes with split/layout support.
 */
export interface SplitLayoutProperties {
	layout?: string;
	ratio?: string;
	valign?: string;
	gap?: string;
	collapse?: string;
}
