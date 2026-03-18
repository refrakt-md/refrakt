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
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', body: 'none' },
	},
	Timeline: {
		block: 'timeline',
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
