import type { RuneConfig } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'header',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Cast: {
		block: 'cast',
		defaultDensity: 'full',
		sections: { header: 'header', headline: 'title', blurb: 'description' },
		modifiers: {
			layout: { source: 'meta', default: 'grid' },
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', members: 'none' },
	},
	CastMember: {
		block: 'cast-member',
		parent: 'Cast',
		editHints: { name: 'inline', role: 'inline', body: 'none' },
	},
	Organization: {
		block: 'organization',
		defaultDensity: 'full',
		sections: { header: 'header', headline: 'title', blurb: 'description', body: 'body' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', body: 'none' },
	},
	Timeline: {
		block: 'timeline',
		defaultDensity: 'full',
		sequence: 'connected',
		sequenceDirection: { fromModifier: 'direction', default: 'vertical' },
		sections: { header: 'header', headline: 'title', blurb: 'description' },
		modifiers: { direction: { source: 'meta', default: 'vertical' } },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', entries: 'none' },
	},
	TimelineEntry: {
		block: 'timeline-entry',
		parent: 'Timeline',
		editHints: { date: 'inline', label: 'inline', body: 'none' },
	},
};
