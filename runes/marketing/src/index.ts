import type { RunePackage } from '@refrakt-md/types';
import { hero } from './tags/hero.js';
import { cta } from './tags/cta.js';
import { bento, bentoCell } from './tags/bento.js';
import { feature, definition } from './tags/feature.js';
import { steps, step } from './tags/steps.js';
import { pricing, tier } from './tags/pricing.js';
import { testimonial } from './tags/testimonial.js';
import { comparison, comparisonColumn, comparisonRow } from './tags/comparison.js';
import { config } from './config.js';

export const marketing: RunePackage = {
  name: 'marketing',
  displayName: 'Marketing',
  version: '0.6.0',
  runes: {
    'hero': {
      transform: hero,
      description: 'Full-width introductory section for landing pages with title, subtitle, and call-to-action',
      reinterprets: { heading: 'hero title', paragraph: 'subtitle/tagline', list: 'action buttons', image: 'hero image' },
    },
    'cta': {
      transform: cta,
      aliases: ['call-to-action'],
      description: 'Call-to-action section with headline, actions, and optional showcase',
      reinterprets: { heading: 'section headline', paragraph: 'blurb', list: 'action items', fence: 'command' },
    },
    'bento': {
      transform: bento,
      description: 'Magazine-style bento grid where heading levels determine cell size',
      reinterprets: { heading: 'cell title (level determines size)', paragraph: 'cell content', image: 'cell background' },
    },
    'bento-cell': {
      transform: bentoCell,
      description: 'Individual cell within a bento grid',
    },
    'feature': {
      transform: feature,
      description: 'Feature showcase with definition list of items',
      reinterprets: { heading: 'section headline', paragraph: 'description', list: 'feature definitions', image: 'feature icon' },
    },
    'definition': {
      transform: definition,
      description: 'Individual feature definition with icon, name, and description',
      reinterprets: { heading: 'feature name', paragraph: 'feature description', image: 'feature icon' },
    },
    'steps': {
      transform: steps,
      description: 'Sequential step-by-step instructions',
      reinterprets: { heading: 'step name', paragraph: 'step content' },
    },
    'step': {
      transform: step,
      description: 'Individual step within a steps sequence',
    },
    'pricing': {
      transform: pricing,
      description: 'Pricing table with tier comparison',
      seoType: 'Product',
      reinterprets: { heading: 'section headline', paragraph: 'section description' },
    },
    'tier': {
      transform: tier,
      description: 'Individual pricing tier with name, price, and features',
      seoType: 'Offer',
    },
    'testimonial': {
      transform: testimonial,
      aliases: ['review'],
      description: 'Customer testimonial or review with quote, author attribution, and optional rating',
      seoType: 'Review',
      reinterprets: { blockquote: 'testimonial quote', strong: 'author name', paragraph: 'author role', image: 'avatar' },
    },
    'comparison': {
      transform: comparison,
      aliases: ['versus', 'vs'],
      description: 'Product/feature comparison matrix where headings become columns and bold labels align rows across columns',
      reinterprets: { heading: 'column header', list: 'feature rows', strong: 'row alignment label', s: 'negative indicator', blockquote: 'callout badge' },
    },
    'comparison-column': {
      transform: comparisonColumn,
      description: 'Individual column within a comparison matrix',
    },
    'comparison-row': {
      transform: comparisonRow,
      description: 'Individual row/cell within a comparison column',
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default marketing;
