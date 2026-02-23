export interface Fixture {
	name: string;
	description: string;
	source: string;
}

export const fixtures: Fixture[] = [
	{
		name: 'Prose',
		description: 'Typography, text colors, links, inline code',
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
		name: 'Hints',
		description: 'All 4 semantic color variants',
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
		name: 'Code Block',
		description: 'Syntax highlighting tokens',
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
		name: 'Steps',
		description: 'Primary accent, surfaces, borders',
		source: `{% steps %}

## Install the theme

Download the theme package and install it with the CLI.

## Configure your project

Update \`refrakt.config.json\` to point to the new theme.

## Start the dev server

Run \`npm run dev\` to see your site with the new theme applied.

{% /steps %}`,
	},
	{
		name: 'Pricing',
		description: 'Surfaces, borders, radii, shadows, primary accent',
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
		name: 'Timeline',
		description: 'Primary accent, borders, muted text',
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
		name: 'Recipe',
		description: 'Surfaces, badges, typography, metadata',
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
		name: 'Accordion',
		description: 'Surfaces, borders, active states',
		source: `{% accordion %}

## What is a design token?

A design token is a named value that represents a visual design decision — a color, font, spacing value, shadow, or border radius. Tokens make design systems consistent and themeable.

## How do themes work?

Themes override the default token values with custom ones. Because all rune CSS references tokens via \`var(--rf-*)\`, changing tokens automatically restyles every component.

## Can I use my own fonts?

Yes. Set the \`--rf-font-sans\` and \`--rf-font-mono\` tokens to any font family. Make sure the fonts are loaded in your project (via Google Fonts, local files, etc.).

{% /accordion %}`,
	},
	{
		name: 'Tabs',
		description: 'Surface hierarchy, active states, borders',
		source: `{% tabs %}

## Overview

This tab shows the overview content. Tabs test surface hierarchy — the active tab should stand out from inactive ones, and the content area should have a clear boundary.

## Configuration

Configure the theme by editing token values. Each token maps to a CSS custom property that controls a specific visual attribute across all runes.

## Export

Export your theme as a package (tarball or zip) and install it in any refrakt.md project. The theme overrides Lumina's default tokens while keeping all rune CSS intact.

{% /tabs %}`,
	},
];
