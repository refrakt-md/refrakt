import type { Plugin } from '@refrakt-md/types';
import { bento, bentoCell } from './tags/bento.js';
import { feature, definition } from './tags/feature.js';
import { steps, step } from './tags/steps.js';
import { pricing, tier } from './tags/pricing.js';
import { comparison, comparisonColumn, comparisonRow } from './tags/comparison.js';
import { config } from './config.js';

export const marketing: Plugin = {
	name: 'marketing',
	displayName: 'Marketing',
	version: '0.49.0',
	// SPEC-153 D2 — composed runes, one `<rune>.md` each. `hero`, `cta` and
	// `testimonial` went live here from `site/staged-runes/` (SPEC-181 D5,
	// WORK-702 to WORK-704).
	runeDir: 'runes',
	runes: {
		bento: {
			transform: bento,
			description: 'Magazine-style bento grid where heading levels determine cell size',
			snippet: [
				'{% bento columns=${1:3} %}',
				'# ${2:Large Cell}',
				'',
				'${3:Content}',
				'',
				'## ${4:Medium Cell}',
				'',
				'${5:Content}',
				'',
				'## ${6:Another Cell}',
				'',
				'${7:Content}',
				'{% /bento %}',
			],
			fixture: `{% bento %}
# Main Feature
![Showcase](placeholder:cover)
---
The primary showcase area with plenty of room for a detailed description.

## Secondary Feature
![Highlight](placeholder:square)
---
A supporting feature with moderate space.

#### Compact One
A compact 2×1 cell.

#### Compact Two
Another compact 2×1 cell.

### Detail Left
![Detail](placeholder:wide)
---
A medium tile that fills the lower-left.

### Detail Right
![Detail](placeholder:wide)
---
A medium tile that fills the lower-right.
{% /bento %}`,
		},
		'bento-cell': {
			transform: bentoCell,
			description: 'Individual cell within a bento grid',
		},
		feature: {
			transform: feature,
			description: 'Feature showcase with definition list of items',
			snippet: [
				'{% feature %}',
				'## ${1:Features}',
				'',
				'${2:Feature Name}',
				': ${3:Feature description}',
				'',
				'${4:Another Feature}',
				': ${5:Another description}',
				'{% /feature %}',
			],
			fixture: `{% feature %}
# Why Refrakt

Runes reinterpret standard Markdown — same syntax, richer meaning.

- **Fast** — Static generation, zero runtime JavaScript
- **Flexible** — 43+ runes, infinite combinations
- **Themeable** — Full control over every element
{% /feature %}`,
		},
		definition: {
			transform: definition,
			description: 'Individual feature definition with icon, name, and description',
		},
		steps: {
			transform: steps,
			description: 'Sequential step-by-step instructions',
			snippet: [
				'{% steps %}',
				'## ${1:First Step}',
				'',
				'${2:Instructions for step one.}',
				'',
				'## ${3:Second Step}',
				'',
				'${4:Instructions for step two.}',
				'{% /steps %}',
			],
			fixture: `{% steps %}
# Install dependencies
Run \`npm install @refrakt-md/cli\` to add the CLI to your project.

# Create content
Write your first Markdown file using rune tags for rich components.

# Build and preview
Run \`npm run dev\` to start the development server and see your content rendered.
{% /steps %}`,
		},
		step: {
			transform: step,
			description: 'Individual step within a steps sequence',
		},
		pricing: {
			transform: pricing,
			description: 'Pricing table with tier comparison',
			seoType: 'Product',
			snippet: [
				'{% pricing %}',
				'## ${1:Free} \\u2014 \\$${2:0}',
				'',
				'- ${3:Feature one}',
				'- ${4:Feature two}',
				'',
				'## ${5:Pro} \\u2014 \\$${6:19}/mo',
				'',
				'- ${7:Everything in Free}',
				'- ${8:Pro feature}',
				'{% /pricing %}',
			],
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
		tier: {
			transform: tier,
			description: 'Individual pricing tier with name, price, and features',
			seoType: 'Offer',
		},
		comparison: {
			transform: comparison,
			aliases: ['versus', 'vs'],
			description:
				'Product/feature comparison matrix where headings become columns and bold labels align rows across columns',
			snippet: [
				'{% comparison layout="${1:table}" %}',
				'## ${2:Option A}',
				'',
				'- **${4:Feature}**: ${5:Value}',
				'',
				'## ${3:Option B}',
				'',
				'- **${4:Feature}**: ${6:Value}',
				'{% /comparison %}',
			],
			fixture: `{% comparison highlighted="Svelte" %}
## React
- **Learning Curve** — Moderate
- **Bundle Size** — ~40kb
- **Reactivity** — Virtual DOM
- ~~Server Components~~ — Experimental

## Svelte
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

// SPEC-161 D1 — the attribution codemod, and the parser it shares with the rune.

export type {
	FeatureProps,
	CtaProps,
	StepProps,
	StepsProps,
	TierProps,
	PricingProps,
	ComparisonRowProps,
	ComparisonColumnProps,
	ComparisonProps,
	HeroProps,
	BentoCellProps,
	BentoProps,
	TestimonialProps,
} from './props.js';
