import type { RuneConfig } from '@refrakt-md/transform';

// SPEC-125 Phase 2 — the join tables (`sections`, `mediaSlots`, `frameTarget`)
// are declared in the tag modules that own them and referenced here. Config
// points at rune identity; it does not define it (ADR-028). The engine's read
// path is unchanged — it still reads `config.sections` and friends.
import { castSections } from './tags/cast.js';
import { organizationSections } from './tags/organization.js';
import { timelineSections } from './tags/timeline.js';

const pageSectionAutoLabel = {
	header: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Cast: {
		block: 'cast',
		defaultDensity: 'full',
		sections: castSections,
		modifiers: {
			layout: { source: 'meta', default: 'grid' },
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', items: 'none' },
	},
	CastMember: {
		block: 'cast-member',
		parent: 'Cast',
		defaultElevation: 'flat',
		editHints: { name: 'inline', role: 'inline', body: 'none' },
	},
	Organization: {
		block: 'organization',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: organizationSections,
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', blurb: 'inline', body: 'none' },
	},
	Timeline: {
		block: 'timeline',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sequence: 'connected',
		sequenceDirection: { fromModifier: 'direction', default: 'vertical' },
		sections: timelineSections,
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
