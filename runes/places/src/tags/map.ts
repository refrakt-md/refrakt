import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';

const variantType = ['street', 'satellite', 'terrain', 'dark', 'minimal'] as const;
const heightType = ['small', 'medium', 'large', 'full'] as const;
const providerType = ['openstreetmap', 'mapbox'] as const;

// Match coordinate pairs like "48.8566, 2.3522" or "-33.8688, 151.2093"
const COORD_PATTERN = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;

// Separator between name/description/coordinates: " - ", " — ", " – "
const SEPARATOR = /\s*[-–—]\s*/;

// Extract plain text content from an AST node
function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

// Parse a list item node into location properties
function parseLocationItem(node: Node): {
	name: string;
	description: string;
	lat: string;
	lng: string;
	address: string;
	url: string;
} {
	let name = '';
	let description = '';
	let url = '';

	// Walk the item's direct children (paragraph/inline wrapper)
	const allNodes = Array.from(node.walk());

	for (const child of allNodes) {
		if (child.type === 'strong') {
			name = Array.from(child.walk())
				.filter(n => n.type === 'text')
				.map(n => n.attributes.content)
				.join('');
		} else if (child.type === 'em' && child !== node) {
			// Only pick up em nodes that aren't the root
			const emText = Array.from(child.walk())
				.filter(n => n.type === 'text')
				.map(n => n.attributes.content)
				.join('');
			if (!description) description = emText;
		} else if (child.type === 'link') {
			url = child.attributes.href || '';
		}
	}

	// Collect all text content and strip out the name/description parts
	const fullText = extractText(node);
	let remaining = fullText;
	if (name) remaining = remaining.replace(name, '');
	if (description) remaining = remaining.replace(description, '');

	// Extract coordinates BEFORE stripping separators, so negative signs survive
	let lat = '';
	let lng = '';
	const coordMatch = remaining.match(COORD_PATTERN);
	if (coordMatch) {
		lat = coordMatch[1];
		lng = coordMatch[2];
		remaining = remaining.replace(COORD_PATTERN, '').trim();
	}

	// Strip separators
	remaining = remaining.replace(new RegExp(SEPARATOR.source, 'g'), ' ').trim();

	// Whatever is left is the address
	const address = remaining.replace(/\s+/g, ' ').trim();

	// If no name was found via bold, use the address or full text
	if (!name && !lat && !lng) {
		name = address || fullText.trim();
	} else if (!name) {
		name = address || `${lat}, ${lng}`;
	}

	return { name, description, lat, lng, address, url };
}

const mapPin = createContentModelSchema({
	attributes: {
		name: { type: String, required: false },
		description: { type: String, required: false },
		lat: { type: String, required: false },
		lng: { type: String, required: false },
		address: { type: String, required: false },
		url: { type: String, required: false },
		group: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(resolved, attrs) {
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const descriptionTag = new Tag('span', {}, [attrs.description ?? '']);
		const latMeta = new Tag('meta', { content: attrs.lat ?? '' });
		const lngMeta = new Tag('meta', { content: attrs.lng ?? '' });
		const addressMeta = new Tag('meta', { content: attrs.address ?? '' });
		const urlMeta = new Tag('meta', { content: attrs.url ?? '' });
		const groupMeta = new Tag('meta', { content: attrs.group ?? '' });

		return createComponentRenderable({ rune: 'map-pin',
			tag: 'li',
			properties: {
				lat: latMeta,
				lng: lngMeta,
				address: addressMeta,
				url: urlMeta,
				group: groupMeta,
			},
			refs: {
				name: nameTag,
				description: descriptionTag,
			},
			children: [nameTag, descriptionTag, latMeta, lngMeta, addressMeta, urlMeta, groupMeta],
		});
	},
});

// Parse list items into map-pin tags with heading-based grouping
function convertMapChildren(nodes: unknown[]): unknown[] {
	const converted: Node[] = [];
	let currentGroup = '';

	for (const node of nodes as Node[]) {
		if (node.type === 'heading') {
			currentGroup = extractText(node);
		} else if (node.type === 'list') {
			for (const item of node.children) {
				if (item.type === 'item') {
					const loc = parseLocationItem(item);
					converted.push(new Ast.Node('tag', {
						name: loc.name,
						description: loc.description,
						lat: loc.lat,
						lng: loc.lng,
						address: loc.address,
						url: loc.url,
						group: currentGroup,
					}, [], 'map-pin'));
				}
			}
		} else {
			converted.push(node);
		}
	}

	return converted;
}

export { mapPin };

export const map = createContentModelSchema({
	attributes: {
		zoom: { type: String, required: false, description: 'Initial zoom level of the map (higher values zoom in closer).' },
		center: { type: String, required: false, description: 'Coordinates to center the map on (e.g. "48.8566, 2.3522").' },
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Visual style of the map tiles: street, satellite, terrain, dark, or minimal.' },
		height: { type: String, required: false, matches: heightType.slice(), description: 'Vertical size of the map container: small, medium, large, or full.' },
		provider: { type: String, required: false, matches: providerType.slice(), description: 'Tile provider used for rendering: openstreetmap or mapbox.' },
		interactive: { type: Boolean, required: false, description: 'Enable or disable pan and zoom interaction on the map.' },
		route: { type: Boolean, required: false, description: 'Enable or disable drawing a route line between pins.' },
		cluster: { type: Boolean, required: false, description: 'Enable or disable grouping nearby pins into clusters at low zoom.' },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertMapChildren,
		description: 'Parses list items into map-pin tags with bold names, italic descriptions, '
			+ 'link URLs, coordinate regex extraction, and heading-based grouping.',
	},
	transform(resolved, attrs, config) {
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.children), config) as RenderableTreeNode[],
		);

		const zoomMeta = new Tag('meta', { content: attrs.zoom ?? '' });
		const centerMeta = new Tag('meta', { content: attrs.center ?? '' });
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'street' });
		const heightMeta = new Tag('meta', { content: attrs.height ?? 'medium' });
		const providerMeta = new Tag('meta', { content: attrs.provider ?? 'openstreetmap' });
		const interactiveMeta = new Tag('meta', { content: String(attrs.interactive ?? true) });
		const routeMeta = new Tag('meta', { content: String(attrs.route ?? false) });
		const clusterMeta = new Tag('meta', { content: String(attrs.cluster ?? false) });

		const pins = body.tag('li').typeof('MapPin');
		const pinsList = new Tag('ol', {}, pins.toArray());

		return createComponentRenderable({ rune: 'map', schemaOrgType: 'Place',
			tag: 'div',
			properties: {
				zoom: zoomMeta,
				center: centerMeta,
				variant: variantMeta,
				height: heightMeta,
				provider: providerMeta,
				interactive: interactiveMeta,
				route: routeMeta,
				cluster: clusterMeta,
				pin: pins,
			},
			refs: { pins: pinsList },
			children: [zoomMeta, centerMeta, variantMeta, heightMeta, providerMeta, interactiveMeta, routeMeta, clusterMeta, pinsList],
		});
	},
});
