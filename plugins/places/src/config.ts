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
		sections: { headline: 'title', blurb: 'description', body: 'body' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', body: 'none', date: 'none', endDate: 'none', location: 'none', register: 'link' },
		modifiers: {
			date: { source: 'meta' },
			endDate: { source: 'meta' },
			location: { source: 'meta' },
			url: { source: 'meta' },
		},
		metaFields: {
			date: { metaType: 'temporal', label: 'Date', condition: 'date' },
			endDate: { metaType: 'temporal', label: 'Ends', condition: 'endDate' },
			location: { metaType: 'category', label: 'Location', condition: 'location' },
			register: { label: 'Register', href: 'url', condition: 'url' },
		},
		// When/where as a labelled def-list under the title/description; the
		// Register CTA renders last as a bar-wrapped link.
		blocks: {
			metadata: { fields: ['date', 'endDate', 'location'], layout: 'definition-list' },
			register: { fields: ['register'], layout: 'bar' },
		},
		layout: { root: ['eyebrow', 'headline', 'blurb', 'metadata', 'body', 'register'] },
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
