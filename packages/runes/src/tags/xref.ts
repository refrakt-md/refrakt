import Markdoc from '@markdoc/markdoc';
import type { Config, Node, Schema } from '@markdoc/markdoc';
const { Tag } = Markdoc;

/** Sentinel attribute value used to identify xref placeholders in the renderable tree */
export const XREF_RUNE_MARKER = 'xref';

/**
 * Xref rune — inline self-closing tag that resolves an entity by ID or name
 * from the entity registry and renders a navigable link.
 *
 * At Phase 1 (transform time) the registry isn't populated yet, so the rune
 * emits a placeholder span. Phase 4 (postProcess) resolves the placeholder
 * into a link or an unresolved indicator.
 *
 * Usage:
 *   {% xref "RF-138" /%}
 *   {% xref "Veshra" label="the exile" /%}
 *   {% xref "Sanctuary" type="realm" /%}
 */
export const xref: Schema = {
	selfClosing: true,
	inline: true,
	attributes: {
		primary: {
			type: String,
			required: true,
			description: 'Entity ID or name to resolve',
		},
		label: {
			type: String,
			required: false,
			description: 'Custom link text (defaults to entity title)',
		},
		type: {
			type: String,
			required: false,
			description: 'Entity type hint for disambiguation',
		},
	},
	transform(node: Node, config: Config) {
		const id = node.attributes.primary as string;
		const label = node.attributes.label as string | undefined;
		const type = node.attributes.type as string | undefined;

		const attrs: Record<string, string> = {
			'data-rune': XREF_RUNE_MARKER,
			'data-xref-id': id,
		};

		if (label) attrs['data-xref-label'] = label;
		if (type) attrs['data-xref-type'] = type;

		// Placeholder text: custom label or the raw reference string
		return new Tag('span', attrs, [label || id]);
	},
};
