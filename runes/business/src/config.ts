import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Cast: { block: 'cast' },
	CastMember: { block: 'cast-member', parent: 'Cast' },
	Organization: { block: 'organization' },
	Timeline: { block: 'timeline', modifiers: { direction: { source: 'meta', default: 'vertical' } } },
	TimelineEntry: { block: 'timeline-entry', parent: 'Timeline' },
};
