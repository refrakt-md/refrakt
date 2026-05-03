import type { RunePackage } from '@refrakt-md/types';
import { cast, castMember } from './tags/cast.js';
import { organization } from './tags/organization.js';
import { timeline, timelineEntry } from './tags/timeline.js';
import { config } from './config.js';

export const business: RunePackage = {
  name: 'business',
  displayName: 'Business',
  version: '0.11.1',
  runes: {
    'cast': {
      transform: cast,
      aliases: ['team'],
      description: 'People directory for team pages, cast lists, or speaker lineups. List items with "Name - Role" pattern become entries.',
      seoType: 'Person',
      category: 'Semantic',
      snippet: ['{% cast %}', '- ${1:Name} - ${2:Role}', '- ${3:Name} - ${4:Role}', '{% /cast %}'],
      fixture: `{% cast %}
- **Alice Chen** — Lead Engineer
- **Bob Martinez** — Product Designer
- **Carol Kim** — Engineering Manager
{% /cast %}`,
    },
    'cast-member': {
      transform: castMember,
      description: 'Individual cast/team member with name and role',
    },
    'organization': {
      transform: organization,
      aliases: ['business'],
      description: 'Structured business/organization information with contact details, hours, and location',
      seoType: 'Organization',
      category: 'Semantic',
      snippet: ['{% organization %}', '# ${1:Organization Name}', '', '${2:Description}', '{% /organization %}'],
      fixture: `{% organization type="LocalBusiness" %}
# Acme Coffee Shop

Your neighborhood coffee shop since 2015.

- **Address:** 123 Main St, Portland, OR
- **Hours:** Mon–Fri 7am–6pm, Sat–Sun 8am–5pm
- **Phone:** (503) 555-0123
- [Website](https://acme.coffee)
- [Instagram](https://instagram.com/acmecoffee)
{% /organization %}`,
    },
    'timeline': {
      transform: timeline,
      description: 'Chronological event display where headings become dated milestones',
      seoType: 'ItemList',
      category: 'Semantic',
      snippet: ['{% timeline %}', '## ${1:2024} \\u2014 ${2:Milestone One}', '', '${3:Description of this milestone.}', '', '## ${4:2025} \\u2014 ${5:Milestone Two}', '', '${6:Description of this milestone.}', '{% /timeline %}'],
      fixture: `{% timeline %}
## 2024 — Project Inception
Initial prototype exploring Markdoc extensions for component-rich content.

## 2025 — Open Source Launch
First public release with 20 runes and the Lumina theme.

## 2026 — Theme Ecosystem
Launch of the theme marketplace and inspect tooling for developers.
{% /timeline %}`,
    },
    'timeline-entry': {
      transform: timelineEntry,
      description: 'Individual timeline entry with date and label',
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default business;

export type {
	CastMemberProps, CastProps,
	OrganizationProps,
	TimelineEntryProps, TimelineProps,
} from './props.js';
