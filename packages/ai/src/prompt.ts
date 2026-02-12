/**
 * Rune metadata interface — structurally compatible with Rune from @refract-md/runes
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
npm install @refract-md/runes
\`\`\`

## yarn

\`\`\`shell
yarn add @refract-md/runes
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
## What is refract.md?

A content framework that extends Markdown with semantic runes.

## How do I install it?

Run \`npm install @refract-md/runes\` to get started.

## Is it free?

Yes, refract.md is open source and free to use.
{% /accordion %}`,

	toc: `{% toc depth=3 %}{% /toc %}`,

	hero: `{% hero align="center" %}
# Build faster with refract.md

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
> refract.md completely changed how we think about documentation.
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

	changelog: `{% changelog project="refract.md" %}
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

export function generateSystemPrompt(runes: Record<string, RuneInfo>): string {
	const runeDescriptions = Object.values(runes)
		.filter(rune => !EXCLUDED_RUNES.has(rune.name))
		.map(rune => describeRune(rune))
		.join('\n\n');

	return `You are a content author for a website built with refract.md.
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
- Do NOT invent rune names that are not listed below.

## Available Runes

${runeDescriptions}`;
}
