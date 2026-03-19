import type { RuneConfig } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'header',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
};

export const config: Record<string, RuneConfig> = {
	Blog: {
		block: 'blog',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			layout: { source: 'meta', default: 'list' },
			sort: { source: 'meta', default: 'date-desc', noBemClass: true },
			filter: { source: 'meta', noBemClass: true },
			limit: { source: 'meta', noBemClass: true },
			folder: { source: 'meta', noBemClass: true },
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline' },
	},
};
