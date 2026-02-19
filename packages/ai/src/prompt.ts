/**
 * Rune metadata interface — structurally compatible with Rune from @refrakt-md/runes
 * without requiring a runtime dependency.
 */
export interface RuneInfo {
	name: string;
	aliases: string[];
	description: string;
	reinterprets: Record<string, string>;
	schema: {
		attributes?: Record<string, {
			type?: unknown;
			required?: boolean;
			matches?: unknown;
		}>;
	};
}

/** Runes that are internal or child-only — excluded from prompts */
const EXCLUDED_RUNES = new Set([
	'error',
	'definition',
	'step',
	'tab',
	'music-recording',
	'accordion-item',
	'timeline-entry',
	'changelog-release',
	'breadcrumb-item',
	'cast-member',
	'map-pin',
]);

/** Usage examples for each author-facing rune */
const RUNE_EXAMPLES: Record<string, string> = {
	hint: `{% hint type="note" %}
This is a helpful note for your readers.
{% /hint %}`,

	cta: `{% cta %}
# Your Headline

A compelling description of what you're offering.

- [Get Started](/docs/getting-started)
- [Learn More](/about)
{% /cta %}`,

	feature: `{% feature %}
## Key Features

- **Fast builds**

  Static generation with incremental rebuilds.

- **Type-safe content**

  Every rune produces typed, validated output.

- **Zero config**

  Convention-based project structure.
{% /feature %}`,

	grid: `{% grid %}
Column one content.

---

Column two content.

---

Column three content.
{% /grid %}`,

	steps: `{% steps %}
1. Install dependencies

   Run \`npm install\` to get started.

2. Create content

   Add Markdown files to the \`content/\` directory.

3. Start the server

   Run \`npm run dev\` to preview your site.
{% /steps %}`,

	tabs: `{% tabs %}
## npm

\`\`\`shell
npm install @refrakt-md/runes
\`\`\`

## yarn

\`\`\`shell
yarn add @refrakt-md/runes
\`\`\`
{% /tabs %}`,

	codegroup: `{% codegroup %}
\`\`\`js
console.log('Hello');
\`\`\`

\`\`\`python
print('Hello')
\`\`\`
{% /codegroup %}`,

	pricing: `{% pricing %}
# Pricing

Choose the plan that works for you.

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support

[Get Started](/signup/free)
{% /tier %}

{% tier name="Pro" priceMonthly="$29" featured=true %}
- Unlimited projects
- Priority support

[Start Trial](/signup/pro)
{% /tier %}
{% /pricing %}`,

	tier: `{% tier name="Pro" priceMonthly="$29" featured=true %}
- Unlimited projects
- Priority support

[Start Trial](/signup/pro)
{% /tier %}`,

	nav: `{% nav %}
## Getting Started
- getting-started
- installation

## Guides
- theming
- deployment
{% /nav %}`,

	layout: `{% layout %}
{% region name="header" %}
# Site Title
{% /region %}

{% region name="nav" %}
{% nav %}
- getting-started
- runes
{% /nav %}
{% /region %}
{% /layout %}`,

	region: `{% region name="nav" %}
{% nav %}
- page-one
- page-two
{% /nav %}
{% /region %}`,

	'music-playlist': `{% music-playlist audio="/audio/album.mp3" %}
# Album Title

![Album Cover](/images/cover.jpg)

- Track One | 3:42
- Track Two | 4:15
{% /music-playlist %}`,

	details: `{% details summary="How does billing work?" %}
We bill monthly on the date you signed up. You can cancel anytime
from your account settings.
{% /details %}`,

	figure: `{% figure size="large" align="center" caption="Dashboard overview" %}
![Dashboard](/images/dashboard.png)
{% /figure %}`,

	accordion: `{% accordion headingLevel=2 %}
## What is refrakt.md?

A content framework that extends Markdown with semantic runes.

## How do I install it?

Run \`npm install @refrakt-md/runes\` to get started.

## Is it free?

Yes, refrakt.md is open source and free to use.
{% /accordion %}`,

	toc: `{% toc depth=3 %}{% /toc %}`,

	hero: `{% hero align="center" %}
# Build faster with refrakt.md

Transform Markdown into beautiful, structured websites with semantic runes.

- [Get Started](/docs/getting-started)
- [View on GitHub](https://github.com/refrakt-md)
{% /hero %}`,

	breadcrumb: `{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- [Runes](/docs/runes)
- Hero
{% /breadcrumb %}`,

	testimonial: `{% testimonial rating=5 %}
> refrakt.md completely changed how we think about documentation.
> The rune system makes our content portable and semantic.

**Sarah Chen** — VP of Engineering, Acme Corp
{% /testimonial %}`,

	compare: `{% compare %}
\`\`\`javascript
// Before
const x = 1;
const y = 2;
\`\`\`

\`\`\`javascript
// After
const [x, y] = [1, 2];
\`\`\`
{% /compare %}`,

	timeline: `{% timeline %}
## 2021 - Project started

We began building the initial prototype.

## 2023 - First release

Open-sourced the library and published to npm.

## 2024 - Version 2.0

Major rewrite with semantic rune system.
{% /timeline %}`,

	changelog: `{% changelog project="refrakt.md" %}
## v2.1.0 - 2024-03-15

- **Added** Timeline and changelog runes
- **Fixed** Code block rendering in dark mode

## v2.0.0 - 2024-01-01

- **Added** Semantic rune system
- **Changed** Complete rewrite of the rendering engine
{% /changelog %}`,

	embed: `{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video for a full walkthrough.
{% /embed %}`,

	recipe: `{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
# Classic Pasta Carbonara

A rich and creamy Italian pasta dish.

- 400g spaghetti
- 200g pancetta
- 4 egg yolks
- 100g Pecorino Romano
- Black pepper

1. Cook pasta in salted boiling water until al dente
2. Fry pancetta until crispy
3. Whisk egg yolks with grated cheese
4. Toss hot pasta with pancetta, then stir in egg mixture

> Use the pasta water to adjust consistency — add a splash at a time.
{% /recipe %}`,

	howto: `{% howto estimatedTime="PT1H" difficulty="medium" %}
# How to Set Up a Development Environment

You will need:

- Node.js 18+
- Git
- A code editor

1. Install Node.js from the official website
2. Clone the repository with \`git clone\`
3. Run \`npm install\` to install dependencies
4. Start the dev server with \`npm run dev\`
{% /howto %}`,

	event: `{% event date="2025-06-15" endDate="2025-06-17" location="San Francisco, CA" url="https://example.com/register" %}
# Tech Conference 2025

Join us for three days of talks, workshops, and networking.

- Keynote: The Future of Web Development
- Workshop: Building with Semantic Content
- Panel: Open Source Sustainability
{% /event %}`,

	cast: `{% cast layout="grid" %}
# Our Team

- Alice Johnson - CEO
- Bob Smith - CTO
- Carol Williams - Head of Design
- David Chen - Lead Engineer
{% /cast %}`,

	organization: `{% organization type="LocalBusiness" %}
# Acme Coffee Shop

Your neighborhood coffee shop since 2015.

- **Address:** 123 Main St, Portland, OR
- **Hours:** Mon–Fri 7am–6pm, Sat–Sun 8am–5pm
- **Phone:** (503) 555-0123
- [Website](https://acme.coffee)
- [Instagram](https://instagram.com/acmecoffee)
{% /organization %}`,

	datatable: `{% datatable sortable="Name,Price" searchable=true pageSize=10 %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
{% /datatable %}`,

	api: `{% api method="GET" path="/api/users" auth="Bearer token" %}
## List Users

Returns a paginated list of users.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | no | Page number (default: 1) |
| limit | number | no | Items per page (default: 20) |

\`\`\`json
{
  "users": [
    { "id": 1, "name": "Alice" }
  ],
  "total": 42
}
\`\`\`
{% /api %}`,

	diff: `{% diff mode="unified" language="javascript" %}
\`\`\`javascript
function getData() {
  return fetch('/api')
    .then(res => res.json())
    .then(data => data);
}
\`\`\`

\`\`\`javascript
async function getData() {
  const res = await fetch('/api');
  return res.json();
}
\`\`\`
{% /diff %}`,

	chart: `{% chart type="bar" title="Monthly Revenue" %}
| Month | Revenue | Expenses |
|-------|---------|----------|
| Jan   | 4200    | 3100     |
| Feb   | 5100    | 3400     |
| Mar   | 4800    | 3200     |
| Apr   | 6200    | 3800     |
{% /chart %}`,

	diagram: `{% diagram language="mermaid" title="User Flow" %}
\`\`\`mermaid
graph TD
  A[Visit Site] --> B{Logged In?}
  B -->|Yes| C[Dashboard]
  B -->|No| D[Login Page]
  D --> E[Sign Up]
  D --> F[Sign In]
  F --> C
  E --> C
\`\`\`
{% /diagram %}`,

	sidenote: `{% sidenote %}
This is a margin note that provides additional context
without interrupting the main flow of the text.
{% /sidenote %}`,

	preview: `{% preview title="Button Variants" theme="auto" responsive="mobile,tablet,desktop" %}
\`\`\`html
<button class="rf-btn rf-btn--primary">Primary</button>
<button class="rf-btn rf-btn--secondary">Secondary</button>
\`\`\`

<button class="rf-btn rf-btn--primary">Primary</button>
<button class="rf-btn rf-btn--secondary">Secondary</button>
{% /preview %}`,

	sandbox: `{% sandbox framework="tailwind" %}
<div class="flex items-center gap-4 p-6 bg-white rounded-xl shadow-lg max-w-sm">
  <img src="https://i.pravatar.cc/80" alt="Avatar" class="w-16 h-16 rounded-full" />
  <div>
    <h3 class="text-lg font-semibold text-gray-900">Jane Doe</h3>
    <p class="text-sm text-gray-500">Product Designer</p>
  </div>
</div>
{% /sandbox %}`,

	map: `{% map zoom="13" height="large" %}
## Landmarks
- **Eiffel Tower** - *Iconic iron lattice tower* - 48.8566, 2.3522
- **Louvre Museum** - *World's largest art museum* - 48.8606, 2.3376

## Parks
- **Jardin du Luxembourg** - 48.8462, 2.3372
{% /map %}`,
};

function attributeTypeName(type: unknown): string {
	if (type === String) return 'string';
	if (type === Number) return 'number';
	if (type === Boolean) return 'boolean';
	if (type === Array) return 'array';
	if (typeof type === 'function' && (type as { name?: string }).name) {
		return (type as { name: string }).name;
	}
	return 'unknown';
}

function describeAttribute(
	name: string,
	attr: { type?: unknown; required?: boolean; matches?: unknown },
): string {
	const parts: string[] = [`  - ${name}: `];

	if (Array.isArray(attr.matches) && attr.matches.length > 0) {
		const values = attr.matches
			.filter((m: unknown): m is string => typeof m === 'string')
			.map((v: string) => `"${v}"`)
			.join(' | ');
		parts.push(values);
	} else {
		parts.push(attributeTypeName(attr.type));
	}

	parts.push(attr.required ? ' (required)' : ' (optional)');

	return parts.join('');
}

function describeRune(rune: RuneInfo): string {
	const lines: string[] = [];

	lines.push(`### ${rune.name}`);
	if (rune.description) {
		lines.push(rune.description);
	}
	if (rune.aliases.length > 0) {
		lines.push(`Aliases: ${rune.aliases.join(', ')}`);
	}

	// Attributes
	const attrs = rune.schema.attributes;
	if (attrs && Object.keys(attrs).length > 0) {
		lines.push('Attributes:');
		for (const [attrName, attrDef] of Object.entries(attrs)) {
			lines.push(describeAttribute(attrName, attrDef));
		}
	}

	// Reinterprets
	const reinterprets = Object.entries(rune.reinterprets);
	if (reinterprets.length > 0) {
		lines.push('Content interpretation:');
		for (const [element, meaning] of reinterprets) {
			lines.push(`  - ${element} → ${meaning}`);
		}
	}

	// Example
	const example = RUNE_EXAMPLES[rune.name];
	if (example) {
		lines.push('Example:');
		lines.push(example);
	}

	return lines.join('\n');
}

const BASE_INSTRUCTIONS = `You are a content author for a website built with refrakt.md.
Write Markdown files using Markdoc tags called "runes" ({% tag %} syntax).

Content inside a rune is reinterpreted — a heading inside {% cta %}
becomes the hero headline, while inside {% nav %} it becomes a group title.
This context-dependent meaning is what makes runes powerful.

Every page should begin with YAML frontmatter:
---
title: Page Title
description: A brief description
---

## Writing rules

- Use standard Markdown for body text (paragraphs, bold, italic, links, images, code fences, lists).
- Use runes ({% tag %} ... {% /tag %}) for semantic structure.
- Runes can be nested where it makes sense (e.g. {% tier %} inside {% pricing %}).
- Horizontal rules (---) delimit grid cells inside {% grid %} and {% codegroup %}.
- Do NOT invent rune names that are not listed below.`;

/**
 * Returns the system prompt as two separate parts for cache-aware usage:
 * [0] Base instructions (role description, writing rules) — stable across all modes
 * [1] Rune vocabulary (available runes section) — varies by mode
 */
export function generateSystemPromptParts(
	runes: Record<string, RuneInfo>,
	includeRunes?: Set<string>,
): [string, string] {
	const runeDescriptions = Object.values(runes)
		.filter(rune => !EXCLUDED_RUNES.has(rune.name))
		.filter(rune => !includeRunes || includeRunes.has(rune.name))
		.map(rune => describeRune(rune))
		.join('\n\n');

	return [BASE_INSTRUCTIONS, `## Available Runes\n\n${runeDescriptions}`];
}

export function generateSystemPrompt(
	runes: Record<string, RuneInfo>,
	includeRunes?: Set<string>,
): string {
	return generateSystemPromptParts(runes, includeRunes).join('\n\n');
}
