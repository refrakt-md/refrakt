import type { RuneConfig } from '@refrakt-md/transform';
import { isTag, findMeta, makeTag } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Event: {
		block: 'event',
		defaultDensity: 'full',
		sections: { details: 'header', preamble: 'preamble', headline: 'title', blurb: 'description', content: 'body' },
		contentWrapper: { tag: 'div', ref: 'content' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', body: 'none', detail: 'none', label: 'none', value: 'none', 'end-date': 'none', register: 'link' },
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
							{ tag: 'span', ref: 'value', metaText: 'date', metaType: 'temporal', metaRank: 'primary' },
							{ tag: 'span', ref: 'end-date', metaText: 'endDate', textPrefix: ' — ', condition: 'endDate', metaType: 'temporal', metaRank: 'secondary' },
						],
					},
					{
						tag: 'div', ref: 'detail', condition: 'location',
						children: [
							{ tag: 'span', ref: 'label', children: ['Location'] },
							{ tag: 'span', ref: 'value', metaText: 'location', metaType: 'category', metaRank: 'primary' },
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
		defaultDensity: 'full',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', days: 'none' },
		modifiers: {
			variant: { source: 'meta', default: 'day-by-day' },
			direction: { source: 'meta', default: 'vertical' },
		},
	},
	ItineraryDay: {
		block: 'itinerary-day',
		parent: 'Itinerary',
		sequence: 'connected',
		autoLabel: { label: 'header' },
		editHints: { header: 'inline', stops: 'none' },
	},
	ItineraryStop: {
		block: 'itinerary-stop',
		parent: 'Itinerary',
		modifiers: {
			activity: { source: 'meta' },
			duration: { source: 'meta' },
		},
		autoLabel: { time: 'time', location: 'location' },
		editHints: { time: 'none', location: 'none', body: 'none' },
	},
	Map: {
		block: 'map',
		defaultDensity: 'compact',
		editHints: { pins: 'none' },
		modifiers: {
			variant: { source: 'meta', default: 'street' },
			height: { source: 'meta', default: 'medium' },
		},
		postTransform(node) {
			// Move remaining meta values to data attributes for the web component
			const metaProps = ['zoom', 'center', 'provider', 'interactive', 'route', 'cluster', 'apiKey'] as const;
			const dataAttrs: Record<string, string> = {};
			for (const prop of metaProps) {
				const meta = findMeta(node, prop);
				if (meta) {
					const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
					dataAttrs[`data-${kebab}`] = meta.attributes.content;
				}
			}

			// Remove consumed meta children — identify by matching against findMeta results
			const consumedMetas = new Set(
				metaProps.map(prop => findMeta(node, prop)).filter(Boolean),
			);
			const children = node.children.filter(child => !consumedMetas.has(child as any));

			// Wrap remaining children in a container div so the map has
			// visible height before Leaflet JS initialises (prevents the
			// border from rendering as a collapsed strip).
			const containerDiv = makeTag('div', { class: 'rf-map__container' }, children);

			return {
				...node,
				name: 'rf-map',
				attributes: { ...node.attributes, ...dataAttrs },
				children: [containerDiv],
			};
		},
	},
	MapPin: { block: 'map-pin', parent: 'Map', editHints: { name: 'inline', description: 'inline' } },
};
