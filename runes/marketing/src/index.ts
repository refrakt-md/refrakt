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
  version: '0.8.3',
  runes: {
    'hero': {
      transform: hero,
      description: 'Full-width introductory section for landing pages with title, subtitle, and call-to-action',
      reinterprets: { heading: 'hero title', paragraph: 'subtitle/tagline', list: 'action buttons', image: 'hero image' },
      fixture: `{% hero align="center" %}
# Build Beautiful Documentation
From Markdown to pixel-perfect pages in minutes.

- [Get Started](/docs)
- [View on GitHub](https://github.com)
{% /hero %}`,
    },
    'cta': {
      transform: cta,
      aliases: ['call-to-action'],
      description: 'Call-to-action section with headline, actions, and optional showcase',
      reinterprets: { heading: 'section headline', paragraph: 'blurb', list: 'action items', fence: 'command' },
      fixture: `{% cta %}
# Your Headline

A compelling description of what you're offering.

- [Get Started](/docs/getting-started)
- [Learn More](/about)
{% /cta %}`,
    },
    'bento': {
      transform: bento,
      description: 'Magazine-style bento grid where heading levels determine cell size',
      reinterprets: { heading: 'cell title (level determines size)', paragraph: 'cell content', image: 'cell background' },
      fixture: `{% bento %}
# Main Feature
The primary showcase area with plenty of room for a detailed description.

## Secondary Feature
A supporting feature with moderate space.

## Another Feature
More supporting content.

### Small Detail
A compact cell.

### Small Detail
Another compact cell.
{% /bento %}`,
    },
    'bento-cell': {
      transform: bentoCell,
      description: 'Individual cell within a bento grid',
    },
    'feature': {
      transform: feature,
      description: 'Feature showcase with definition list of items',
      reinterprets: { heading: 'section headline', paragraph: 'description', list: 'feature definitions', image: 'feature icon' },
      fixture: `{% feature %}
# Why Refrakt

Runes reinterpret standard Markdown — same syntax, richer meaning.

- **Fast** — Static generation, zero runtime JavaScript
- **Flexible** — 43+ runes, infinite combinations
- **Themeable** — Full control over every element
{% /feature %}`,
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
      fixture: `{% steps %}
# Install dependencies
Run \`npm install @refrakt-md/cli\` to add the CLI to your project.

# Create content
Write your first Markdown file using rune tags for rich components.

# Build and preview
Run \`npm run dev\` to start the development server and see your content rendered.
{% /steps %}`,
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
      fixture: `{% pricing %}
# Choose Your Plan
Select the plan that best fits your needs.

{% tier name="Starter" price="Free" %}
- Up to 3 projects
- Community support
- Basic themes
{% /tier %}

{% tier name="Pro" price="$29/mo" featured="true" %}
- Unlimited projects
- Priority support
- All themes
- Custom domains
{% /tier %}

{% tier name="Enterprise" price="Custom" %}
- Everything in Pro
- SSO & SAML
- Dedicated support
- SLA guarantee
{% /tier %}
{% /pricing %}`,
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
      fixture: `{% testimonial %}
> Refrakt transformed how we write documentation. The rune system means our content authors write Markdown while our designers have full control over the output.

**Sarah Chen** — Head of Developer Experience at Acme Corp

![](/avatars/sarah.jpg)
{% /testimonial %}`,
    },
    'comparison': {
      transform: comparison,
      aliases: ['versus', 'vs'],
      description: 'Product/feature comparison matrix where headings become columns and bold labels align rows across columns',
      reinterprets: { heading: 'column header', list: 'feature rows', strong: 'row alignment label', s: 'negative indicator', blockquote: 'callout badge' },
      fixture: `{% comparison %}
# React
- **Learning Curve** — Moderate
- **Bundle Size** — ~40kb
- **Reactivity** — Virtual DOM
- ~~Server Components~~ — Experimental

# Svelte
- **Learning Curve** — Easy
- **Bundle Size** — ~5kb
- **Reactivity** — Compile-time
- **Server Components** — Native
{% /comparison %}`,
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
