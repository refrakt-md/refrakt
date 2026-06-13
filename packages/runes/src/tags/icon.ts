import type { Config, Node, Schema } from '@markdoc/markdoc';
import { resolveIcon } from '../lib/icon-resolve.js';

/**
 * Icon rune — self-closing tag that resolves an icon name to an inline SVG.
 *
 * Usage:
 *   {% icon name="rocket" /%}              → looks up global.rocket
 *   {% icon name="hint/warning" /%}        → looks up hint.warning
 *   {% icon name="rocket" size="24px" /%}  → with size override
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
