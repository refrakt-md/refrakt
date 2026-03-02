import type { RunePackage } from '@refrakt-md/types';
import { cast, castMember } from './tags/cast.js';
import { organization } from './tags/organization.js';
import { timeline, timelineEntry } from './tags/timeline.js';
import { config } from './config.js';

export const business: RunePackage = {
  name: 'business',
  displayName: 'Business',
  version: '0.6.0',
  runes: {
    'cast': {
      transform: cast,
      aliases: ['team'],
      description: 'People directory for team pages, cast lists, or speaker lineups. List items with "Name - Role" pattern become entries.',
      seoType: 'Person',
      reinterprets: { list: 'people entries (Name - Role)', image: 'avatar/headshot', link: 'profile URL' },
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
      reinterprets: { heading: 'organization name', image: 'logo', link: 'website/social profiles' },
    },
    'timeline': {
      transform: timeline,
      description: 'Chronological event display where headings become dated milestones',
      seoType: 'ItemList',
      reinterprets: { heading: 'date and milestone label', paragraph: 'event description' },
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
