import type { Config, Node, Schema } from '@markdoc/markdoc';
import { resolveIcon } from '../lib/icon-resolve.js';
import { declareUniversalPosture } from '../lib/index.js';

/**
 * Icon rune — self-closing tag that resolves an icon name to an inline SVG.
 *
 * Usage:
 *   {% icon name="rocket" /%}              → looks up global.rocket
 *   {% icon name="hint/warning" /%}        → looks up hint.warning
 *   {% icon name="rocket" size="24px" /%}  → with size override
 *
 * SPEC-125 Phase 3 assessment — `icon` carries no universal attributes, and
 * that is correct rather than an oversight. It resolves to a bare inline
 * `<svg>` (or a `<span class="rf-icon">` fallback) with no `data-rune` marker
 * and no entry in `coreConfig`, so the identity transform never sees it as a
 * rune at all. There is no block to tint, no surface to frame and no body to
 * set a reading register on — and no engine pass that would read such an
 * attribute even if the schema declared one. This is `inline` posture in
 * substance; it is recorded here rather than as a `RuneConfig` field because
 * `icon` has no `RuneConfig`.
 */
export const icon: Schema = {
	selfClosing: true,
	attributes: {
		name: { type: String, required: true, description: 'Icon name, optionally prefixed with group (e.g., "rocket" or "hint/warning")' },
		size: { type: String, required: false, description: 'CSS size override for the icon' },
	},
	transform(node: Node, config: Config) {
		const name = node.attributes.name as string;
		const size = node.attributes.size as string | undefined;

		// Shared with the `icon:` image-src scheme — same registry, same lookup.
		// The rune stays silent on misses (returns the graceful fallback span).
		return resolveIcon(name, config, { size }).tag;
	},
};

// SPEC-125 Phase 3 — an inline `<svg>`/`<span>` with no `data-rune` marker — see the note above.
declareUniversalPosture(icon, 'inline');
