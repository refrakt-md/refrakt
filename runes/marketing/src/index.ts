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
  version: '0.9.8',
  runes: {
    'hero': {
      transform: hero,
      description: 'Full-width introductory section for landing pages with title, subtitle, and call-to-action',
      category: 'Section',
      snippet: ['{% hero align="${1|center,left,right|}" %}', '# ${2:Headline}', '', '${3:Subtitle or tagline}', '', '- [${4:Get Started}](${5:/docs/getting-started})', '{% /hero %}'],
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
      category: 'Section',
      snippet: ['{% cta %}', '## ${1:Ready to get started?}', '', '${2:Description text}', '', '- [${3:Start Now}](${4:/signup})', '{% /cta %}'],
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
      category: 'Layout',
      snippet: ['{% bento columns=${1:3} %}', '# ${2:Large Cell}', '', '${3:Content}', '', '## ${4:Medium Cell}', '', '${5:Content}', '', '## ${6:Another Cell}', '', '${7:Content}', '{% /bento %}'],
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
      category: 'Section',
      snippet: ['{% feature %}', '## ${1:Features}', '', '${2:Feature Name}', ': ${3:Feature description}', '', '${4:Another Feature}', ': ${5:Another description}', '{% /feature %}'],
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
    },
    'steps': {
      transform: steps,
      description: 'Sequential step-by-step instructions',
      category: 'Content',
      snippet: ['{% steps %}', '## ${1:First Step}', '', '${2:Instructions for step one.}', '', '## ${3:Second Step}', '', '${4:Instructions for step two.}', '{% /steps %}'],
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
      category: 'Section',
      snippet: ['{% pricing %}', '## ${1:Free} \\u2014 \\$${2:0}', '', '- ${3:Feature one}', '- ${4:Feature two}', '', '## ${5:Pro} \\u2014 \\$${6:19}/mo', '', '- ${7:Everything in Free}', '- ${8:Pro feature}', '{% /pricing %}'],
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
      category: 'Section',
      snippet: ['{% testimonial %}', '> ${1:Quote text goes here.}', '', '**${2:Author Name}**', '', '${3:Role or company}', '{% /testimonial %}'],
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
      category: 'Section',
      snippet: ['{% comparison layout="${1:table}" %}', '## ${2:Option A}', '', '- **${4:Feature}**: ${5:Value}', '', '## ${3:Option B}', '', '- **${4:Feature}**: ${6:Value}', '{% /comparison %}'],
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

export type {
	FeatureProps, CtaProps, StepProps, StepsProps,
	TierProps, PricingProps,
	ComparisonRowProps, ComparisonColumnProps, ComparisonProps,
	HeroProps, BentoCellProps, BentoProps, TestimonialProps,
} from './props.js';
