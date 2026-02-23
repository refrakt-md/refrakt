import Markdoc from '@markdoc/markdoc';
import type { Config, Node, Schema } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { parseSvgToTags } from '../lib/svg.js';

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

		// Parse name into group + icon name
		let group = 'global';
		let iconName = name;
		const slashIndex = name.indexOf('/');
		if (slashIndex !== -1) {
			group = name.substring(0, slashIndex);
			iconName = name.substring(slashIndex + 1);
		}

		// Look up the SVG string from the icon registry
		const icons = config.variables?.__icons as Record<string, Record<string, string>> | undefined;
		const svgString = icons?.[group]?.[iconName];

		if (svgString) {
			const tag = parseSvgToTags(svgString, name);
			if (size) {
				tag.attributes.width = size;
				tag.attributes.height = size;
			}
			return tag;
		}

		// Graceful fallback — empty span placeholder
		const attrs: Record<string, string> = { class: 'rf-icon', 'data-icon': name };
		if (size) {
			attrs.style = `width:${size};height:${size}`;
		}
		return new Tag('span', attrs);
	},
};
