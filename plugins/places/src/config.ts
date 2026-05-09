import type { RuneConfig } from '@refrakt-md/transform';

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
		sections: { header: 'header', preamble: 'preamble', headline: 'title', blurb: 'description', content: 'body' },
		contentWrapper: { tag: 'div', ref: 'content' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', body: 'none', 'meta-item': 'none', register: 'link' },
		modifiers: {
			date: { source: 'meta' },
			endDate: { source: 'meta' },
			location: { source: 'meta' },
			url: { source: 'meta' },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				conditionAny: ['date', 'location'],
				children: [
					{
						tag: 'div', ref: 'meta',
						children: [
							{ tag: 'span', ref: 'meta-item', metaText: 'date', label: 'Date:', condition: 'date', metaType: 'temporal', metaRank: 'primary' },
							{ tag: 'span', ref: 'meta-item', metaText: 'endDate', label: '—', condition: 'endDate', metaType: 'temporal', metaRank: 'primary' },
							{ tag: 'span', ref: 'meta-item', metaText: 'location', label: 'Location:', condition: 'location', metaType: 'category', metaRank: 'primary' },
						],
					},
				],
			},
			register: {
				tag: 'a', ref: 'register', before: false, condition: 'url',
				attrs: { href: { fromModifier: 'url' } },
				children: ['Register'],
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
			zoom: { source: 'meta', noBemClass: true },
			center: { source: 'meta', noBemClass: true },
			provider: { source: 'meta', noBemClass: true },
			interactive: { source: 'meta', noBemClass: true },
			route: { source: 'meta', noBemClass: true },
			cluster: { source: 'meta', noBemClass: true },
			apiKey: { source: 'meta', noBemClass: true },
		},
		contentWrapper: { tag: 'div', ref: 'container' },
		postTransform(node) {
			// Change element name to web component
			return { ...node, name: 'rf-map' };
		},
	},
	MapPin: { block: 'map-pin', parent: 'Map', editHints: { name: 'inline', description: 'inline' } },
};
