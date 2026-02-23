export type TokenGroup =
	| 'primary'
	| 'typography'
	| 'shadows'
	| 'semantic'
	| 'borders'
	| 'surfaces'
	| 'radii'
	| 'code'
	| 'syntax';

export const ALL_TOKEN_GROUPS: TokenGroup[] = [
	'primary',
	'typography',
	'shadows',
	'semantic',
	'borders',
	'surfaces',
	'radii',
	'code',
	'syntax',
];

export interface Fixture {
	id: string;
	name: string;
	description: string;
	tokenGroups: TokenGroup[];
	source: string;
}

export const fixtures: Fixture[] = [
	{
		id: 'prose',
		name: 'Prose',
		description: 'Typography, text colors, links, inline code',
		tokenGroups: ['typography', 'primary', 'code'],
		source: `# Heading One

## Heading Two

### Heading Three

A paragraph with **bold text**, *italic text*, and a [link to somewhere](https://example.com). Here is some \`inline code\` that should be styled differently.

- First item in a list
- Second item with \`code\`
- Third item

1. Numbered first
2. Numbered second
3. Numbered third

> A blockquote with some insightful text. This tests the blockquote styling with the primary border accent and surface background.`,
	},
	{
		id: 'hints',
		name: 'Hints',
		description: 'All 4 semantic color variants',
		tokenGroups: ['semantic', 'borders'],
		source: `{% hint type="note" %}
This is an informational note. It uses the **info** semantic color tokens.
{% /hint %}

{% hint type="warning" %}
This is a warning. It uses the **warning** semantic color tokens.
{% /hint %}

{% hint type="caution" %}
This is a caution alert. It uses the **danger** semantic color tokens.
{% /hint %}

{% hint type="check" %}
This is a success check. It uses the **success** semantic color tokens.
{% /hint %}`,
	},
	{
		id: 'code',
		name: 'Code Block',
		description: 'Syntax highlighting tokens',
		tokenGroups: ['code', 'syntax'],
		source: `\`\`\`typescript
interface ThemeConfig {
  name: string;
  tokens: Record<string, string>;
}

// Generate a complete theme
function createTheme(config: ThemeConfig): string {
  const { name, tokens } = config;
  const css = Object.entries(tokens)
    .map(([key, value]) => \`  --rf-\${key}: \${value};\`)
    .join('\\n');
  return \`:root {\\n\${css}\\n}\`;
}

const theme = createTheme({
  name: "my-theme",
  tokens: { "color-primary": "#6366f1" }
});
\`\`\``,
	},
	{
		id: 'steps',
		name: 'Steps',
		description: 'Primary accent, surfaces, borders',
		tokenGroups: ['primary', 'typography'],
		source: `{% steps headingLevel=2 %}

## Install the theme

Download the theme package and install it with the CLI.

## Configure your project

Update \`refrakt.config.json\` to point to the new theme.

## Start the dev server

Run \`npm run dev\` to see your site with the new theme applied.

{% /steps %}`,
	},
	{
		id: 'pricing',
		name: 'Pricing',
		description: 'Surfaces, borders, radii, shadows, primary accent',
		tokenGroups: ['surfaces', 'borders', 'radii', 'primary'],
		source: `{% pricing %}

## Free — $0

- 5 projects
- Community support
- Basic themes

## Pro — $10/mo

- Unlimited projects
- Priority support
- All themes
- Custom tokens

## Enterprise — Contact us

- Everything in Pro
- Dedicated support
- Custom integrations
- SLA guarantee

{% /pricing %}`,
	},
	{
		id: 'timeline',
		name: 'Timeline',
		description: 'Primary accent, borders, muted text',
		tokenGroups: ['primary', 'borders'],
		source: `{% timeline %}

## January 2026 — Project kickoff

Defined the core architecture and set up the monorepo structure.

## March 2026 — Beta release

Launched the beta with 20 runes and the Lumina theme.

## June 2026 — Theme Studio

Released the visual theme builder with AI generation.

{% /timeline %}`,
	},
	{
		id: 'recipe',
		name: 'Recipe',
		description: 'Surfaces, badges, typography, metadata',
		tokenGroups: ['surfaces', 'typography'],
		source: `{% recipe prepTime="15 min" cookTime="25 min" servings=4 difficulty="easy" %}

## Classic Pasta Carbonara

A traditional Roman pasta dish with eggs, cheese, and pancetta.

- 400g spaghetti
- 200g pancetta
- 4 egg yolks
- 100g Pecorino Romano
- Black pepper

### Instructions

1. Cook pasta in salted boiling water
2. Fry pancetta until crispy
3. Mix egg yolks with grated cheese
4. Toss hot pasta with pancetta, then egg mixture
5. Season with freshly ground black pepper

{% /recipe %}`,
	},
	{
		id: 'accordion',
		name: 'Accordion',
		description: 'Surfaces, borders, active states',
		tokenGroups: ['surfaces', 'borders'],
		source: `{% accordion headingLevel=2 %}

## What is a design token?

A design token is a named value that represents a visual design decision — a color, font, spacing value, shadow, or border radius. Tokens make design systems consistent and themeable.

## How do themes work?

Themes override the default token values with custom ones. Because all rune CSS references tokens via \`var(--rf-*)\`, changing tokens automatically restyles every component.

## Can I use my own fonts?

Yes. Set the \`--rf-font-sans\` and \`--rf-font-mono\` tokens to any font family. Make sure the fonts are loaded in your project (via Google Fonts, local files, etc.).

{% /accordion %}`,
	},
	{
		id: 'tabs',
		name: 'Tabs',
		description: 'Surface hierarchy, active states, borders',
		tokenGroups: ['surfaces', 'borders'],
		source: `{% tabs headingLevel=2 %}

## Overview

This tab shows the overview content. Tabs test surface hierarchy — the active tab should stand out from inactive ones, and the content area should have a clear boundary.

## Configuration

Configure the theme by editing token values. Each token maps to a CSS custom property that controls a specific visual attribute across all runes.

## Export

Export your theme as a package (tarball or zip) and install it in any refrakt.md project. The theme overrides Lumina's default tokens while keeping all rune CSS intact.

{% /tabs %}`,
	},
	{
		id: 'hero',
		name: 'Hero',
		description: 'Primary colors, typography, buttons, shadows',
		tokenGroups: ['primary', 'typography', 'shadows'],
		source: `{% hero %}

# Build beautiful themes

Create stunning visual identities for your documentation with AI-powered token generation and real-time preview.

- [Get Started](#)
- [View Docs](#)

{% /hero %}`,
	},
	{
		id: 'feature-grid',
		name: 'Feature Grid',
		description: 'Card layout, surface colors, shadows',
		tokenGroups: ['surfaces', 'shadows', 'radii'],
		source: `{% feature %}

## Key Features

- **Token-Based Theming**

  Change ~53 design tokens and restyle every rune instantly. No CSS to write for Tier 1 themes.

- **AI Generation**

  Describe your theme in natural language and get a complete token set with light and dark modes.

- **Live Preview**

  See changes applied to real rune output in real-time as you edit tokens or generate with AI.

- **One-Click Export**

  Download a complete theme package ready to install in any refrakt.md project.

{% /feature %}`,
	},
	{
		id: 'cta',
		name: 'CTA',
		description: 'Button styles, background contrast',
		tokenGroups: ['primary', 'surfaces', 'typography'],
		source: `{% cta %}

## Ready to build your theme?

Start with AI generation or hand-pick every token. Export when you're done.

- [Open Theme Studio](#)

{% /cta %}`,
	},
	{
		id: 'comparison',
		name: 'Comparison',
		description: 'Column layout, highlighted state',
		tokenGroups: ['surfaces', 'primary', 'borders'],
		source: `{% comparison highlighted="Token Theme" %}

## Token Theme

- **Effort** — Change ~53 tokens
- **Coverage** — All 74 runes restyled
- **AI Support** — Full generation + refinement
- **Custom CSS** — None required

## Rune Overrides

- **Effort** — Tokens + per-rune CSS
- **Coverage** — Targeted rune customization
- **AI Support** — Token generation only
- **Custom CSS** — Per-rune overrides

## Full Custom

- **Effort** — Write all CSS from scratch
- **Coverage** — Complete visual control
- **AI Support** — ~~Not available~~
- **Custom CSS** — All 74 rune CSS files

{% /comparison %}`,
	},
	{
		id: 'datatable',
		name: 'Data Table',
		description: 'Table styling, alternating rows, headers',
		tokenGroups: ['surfaces', 'borders', 'typography'],
		source: `{% datatable sortable=true %}

| Token | Category | Type | Default |
|-------|----------|------|---------|
| color-primary | Core Palette | color | #6366f1 |
| color-text | Core Palette | color | #1a1a2e |
| font-sans | Typography | font | system-ui |
| radius-md | Border Radius | size | 8px |
| shadow-md | Shadows | shadow | 0 4px 6px rgba(0,0,0,0.1) |

{% /datatable %}`,
	},
	{
		id: 'blockquote',
		name: 'Blockquote',
		description: 'Border accent, muted text',
		tokenGroups: ['borders', 'typography'],
		source: `> Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes. We use them in place of hard-coded values in order to maintain a scalable and consistent visual system for UI development.
>
> — **Salesforce Lightning Design System**`,
	},
];

export const presets: Record<string, string[]> = {
	all: fixtures.map((f) => f.id),
	docs: ['hints', 'steps', 'code', 'tabs', 'accordion', 'prose'],
	marketing: ['hero', 'pricing', 'feature-grid', 'cta', 'comparison'],
	blog: ['prose', 'timeline', 'recipe', 'blockquote', 'code'],
};
