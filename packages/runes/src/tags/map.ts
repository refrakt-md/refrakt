import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const styleType = ['street', 'satellite', 'terrain', 'dark', 'minimal'] as const;
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
	const textParts: string[] = [];

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

	// Strip separators
	remaining = remaining.replace(new RegExp(SEPARATOR.source, 'g'), ' ').trim();

	// Check for coordinates in remaining text
	let lat = '';
	let lng = '';
	const coordMatch = remaining.match(COORD_PATTERN);
	if (coordMatch) {
		lat = coordMatch[1];
		lng = coordMatch[2];
		remaining = remaining.replace(COORD_PATTERN, '').trim();
	}

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

class MapPinModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	description: string = '';

	@attribute({ type: String, required: false })
	lat: string = '';

	@attribute({ type: String, required: false })
	lng: string = '';

	@attribute({ type: String, required: false })
	address: string = '';

	@attribute({ type: String, required: false })
	url: string = '';

	@attribute({ type: String, required: false })
	group: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const descriptionTag = new Tag('span', {}, [this.description]);
		const latMeta = new Tag('meta', { content: this.lat });
		const lngMeta = new Tag('meta', { content: this.lng });
		const addressMeta = new Tag('meta', { content: this.address });
		const urlMeta = new Tag('meta', { content: this.url });
		const groupMeta = new Tag('meta', { content: this.group });

		return createComponentRenderable(schema.MapPin, {
			tag: 'li',
			properties: {
				name: nameTag,
				description: descriptionTag,
				lat: latMeta,
				lng: lngMeta,
				address: addressMeta,
				url: urlMeta,
				group: groupMeta,
			},
			children: [nameTag, descriptionTag, latMeta, lngMeta, addressMeta, urlMeta, groupMeta],
		});
	}
}

class MapModel extends Model {
	@attribute({ type: String, required: false })
	zoom: string = '';

	@attribute({ type: String, required: false })
	center: string = '';

	@attribute({ type: String, required: false, matches: styleType.slice() })
	style: typeof styleType[number] = 'street';

	@attribute({ type: String, required: false, matches: heightType.slice() })
	height: typeof heightType[number] = 'medium';

	@attribute({ type: String, required: false, matches: providerType.slice() })
	provider: typeof providerType[number] = 'openstreetmap';

	@attribute({ type: String, required: false })
	interactive: string = 'true';

	@attribute({ type: String, required: false })
	route: string = 'false';

	@attribute({ type: String, required: false })
	cluster: string = 'false';

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];
		let currentGroup = '';

		for (const node of nodes) {
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

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const body = this.body.transform();

		const zoomMeta = new Tag('meta', { content: this.zoom });
		const centerMeta = new Tag('meta', { content: this.center });
		const styleMeta = new Tag('meta', { content: this.style });
		const heightMeta = new Tag('meta', { content: this.height });
		const providerMeta = new Tag('meta', { content: this.provider });
		const interactiveMeta = new Tag('meta', { content: this.interactive });
		const routeMeta = new Tag('meta', { content: this.route });
		const clusterMeta = new Tag('meta', { content: this.cluster });

		const pins = body.tag('li').typeof('MapPin');
		const pinsList = new Tag('ol', {}, pins.toArray());

		return createComponentRenderable(schema.Map, {
			tag: 'div',
			properties: {
				zoom: zoomMeta,
				center: centerMeta,
				style: styleMeta,
				height: heightMeta,
				provider: providerMeta,
				interactive: interactiveMeta,
				route: routeMeta,
				cluster: clusterMeta,
				pin: pins,
			},
			refs: { pins: pinsList },
			children: [zoomMeta, centerMeta, styleMeta, heightMeta, providerMeta, interactiveMeta, routeMeta, clusterMeta, pinsList],
		});
	}
}

export const mapPin = createSchema(MapPinModel);
export const map = createSchema(MapModel);
