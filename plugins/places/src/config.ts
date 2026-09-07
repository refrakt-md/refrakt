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
		defaultElevation: 'flat',
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
		// Register CTA renders last as a bar-wrapped link. SPEC-081: the
		// transform emits flat header slots and `layout` builds the preamble
		// <header>, so headline/blurb are individually addressable.
		blocks: {
			metadata: { fields: ['date', 'endDate', 'location'], layout: 'definition-list' },
			register: { fields: ['register'], layout: 'bar' },
		},
		layout: {
			root: ['preamble', 'metadata', 'body', 'register'],
			preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb', 'image'] },
		},
	},
	Itinerary: {
		block: 'itinerary',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', days: 'none' },
		modifiers: {
			variant: { source: 'meta', default: 'day-by-day' },
			direction: { source: 'meta', default: 'vertical' },
		},
	},
	// SPEC-125 Phase 1 — no header-ish role, deliberately. The parent `Itinerary`
	// already holds `title` on its headline, and `prominence` scales *the* header
	// of a page-section family rune: a second title in the same subtree flattens
	// the hierarchy it exists to scale. Lumina also pins
	// `.rf-itinerary-day__header`'s type, so the role would be inert there while
	// `[data-section="title"]`'s `margin: 0` stripped the heading's top margin —
	// a visible cost for no gain. The `stops` slot is a structured list, not a
	// body; the prose lives on each `ItineraryStop`.
	ItineraryDay: {
		block: 'itinerary-day',
		parent: 'Itinerary', requiresParent: 'Itinerary',
		sequence: 'connected',
		autoLabel: { label: 'header' },
		editHints: { header: 'inline', stops: 'none' },
	},
	ItineraryStop: {
		block: 'itinerary-stop',
		parent: 'Itinerary', requiresParent: 'Itinerary',
		modifiers: {
			activity: { source: 'meta' },
			duration: { source: 'meta' },
		},
		autoLabel: { time: 'time', location: 'location' },
		// SPEC-125 Phase 1 — each stop's note is authored prose and its only
		// content region, so it is the `body` role.
		sections: { body: 'body' },
		editHints: { time: 'none', location: 'none', body: 'none' },
	},
	Map: {
		block: 'map',
		interactive: true,
		defaultDensity: 'compact',
		defaultElevation: 'flush',
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
	},
	MapPin: {
		block: 'map-pin',
		parent: 'Map', requiresParent: 'Map',
		editHints: { name: 'inline', description: 'inline' },
		// Pin coordinates and metadata are read at runtime by the <rf-map> web
		// component. They ride the SPEC-082 field bag through the transform, but
		// the bag is stripped from output — so surface them as durable `data-*`
		// attributes on the <li> (noBemClass: pure data, no BEM modifier class).
		modifiers: {
			lat: { source: 'meta', noBemClass: true },
			lng: { source: 'meta', noBemClass: true },
			address: { source: 'meta', noBemClass: true },
			url: { source: 'meta', noBemClass: true },
			group: { source: 'meta', noBemClass: true },
		},
	},
};
