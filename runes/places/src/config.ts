import type { RuneConfig } from '@refrakt-md/transform';
import { isTag, readMeta } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Event: {
		block: 'event',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			date: { source: 'meta' },
			endDate: { source: 'meta' },
			location: { source: 'meta' },
			url: { source: 'meta' },
		},
		structure: {
			details: {
				tag: 'div', before: true,
				children: [
					{
						tag: 'div', ref: 'detail', condition: 'date',
						children: [
							{ tag: 'span', ref: 'label', children: ['Date'] },
							{ tag: 'span', ref: 'value', metaText: 'date' },
							{ tag: 'span', ref: 'end-date', metaText: 'endDate', textPrefix: ' — ', condition: 'endDate' },
						],
					},
					{
						tag: 'div', ref: 'detail', condition: 'location',
						children: [
							{ tag: 'span', ref: 'label', children: ['Location'] },
							{ tag: 'span', ref: 'value', metaText: 'location' },
						],
					},
					{
						tag: 'a', ref: 'register', condition: 'url',
						attrs: { href: { fromModifier: 'url' } },
						children: ['Register'],
					},
				],
			},
		},
	},
	Itinerary: {
		block: 'itinerary',
		modifiers: {
			style: { source: 'meta', default: 'day-by-day' },
			direction: { source: 'meta', default: 'vertical' },
		},
	},
	ItineraryDay: {
		block: 'itinerary-day',
		parent: 'Itinerary',
		autoLabel: { label: 'header' },
	},
	ItineraryStop: {
		block: 'itinerary-stop',
		parent: 'Itinerary',
		modifiers: {
			activity: { source: 'meta' },
			duration: { source: 'meta' },
		},
		autoLabel: { time: 'time', location: 'location' },
	},
	Map: {
		block: 'map',
		modifiers: {
			style: { source: 'meta', default: 'street' },
			height: { source: 'meta', default: 'medium' },
		},
		postTransform(node) {
			// Move remaining meta values to data attributes for the web component
			const metaProps = ['zoom', 'center', 'provider', 'interactive', 'route', 'cluster', 'apiKey'] as const;
			const dataAttrs: Record<string, string> = {};
			for (const prop of metaProps) {
				const val = readMeta(node, prop);
				if (val) {
					const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
					dataAttrs[`data-${kebab}`] = val;
				}
			}

			// Remove consumed meta children
			const children = node.children.filter(child => {
				if (!isTag(child) || child.name !== 'meta') return true;
				const prop = child.attributes.property;
				return !(metaProps as readonly string[]).includes(prop);
			});

			return {
				...node,
				name: 'rf-map',
				attributes: { ...node.attributes, ...dataAttrs },
				children,
			};
		},
	},
	MapPin: { block: 'map-pin', parent: 'Map' },
};
