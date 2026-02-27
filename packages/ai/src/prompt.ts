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

/** Attributes to hide from the AI prompt (rune.attribute format) */
const HIDDEN_ATTRIBUTES = new Set([
	'feature.split',
]);

import { RUNE_EXAMPLES } from '@refrakt-md/runes';

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
		const entries = Object.entries(attrs).filter(
			([name]) => !HIDDEN_ATTRIBUTES.has(`${rune.name}.${name}`),
		);
		if (entries.length > 0) {
			lines.push('Attributes:');
			for (const [attrName, attrDef] of entries) {
				lines.push(describeAttribute(attrName, attrDef));
			}
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
Write content using Markdoc tags called "runes" ({% tag %} syntax).

Content inside a rune is reinterpreted — a heading inside {% cta %}
becomes the hero headline, while inside {% nav %} it becomes a group title.
This context-dependent meaning is what makes runes powerful.

## Writing rules

- Use standard Markdown for body text (paragraphs, bold, italic, links, images, code fences, lists).
- Use runes ({% tag %} ... {% /tag %}) for semantic structure.
- Runes can be nested where it makes sense (e.g. {% tier %} inside {% pricing %}).
- Horizontal rules (---) delimit grid cells inside {% grid %} and {% codegroup %}.
- Do NOT invent rune names that are not listed below.`;

/** Mode-specific writing guidance appended to the rune vocabulary layer */
const MODE_GUIDANCE: Record<string, string> = {
	general: `## General Mode Guidelines

You have access to core layout runes plus page-level runes (hero, cta, feature). Use them when the user asks for structured content:
- {% hero %} for page introductions with headline + call-to-action links
- {% cta %} for standalone call-to-action sections
- {% feature %} for listing product/service features with descriptions
- {% grid %} for multi-column layouts
- {% tabs %}, {% accordion %}, {% details %} for organizing content
- {% steps %} for sequential instructions
- {% comparison %} for side-by-side data tables`,

	code: `## Code & Docs Mode Guidelines

Use code-focused runes to create rich technical documentation:
- {% codegroup %} for showing the same concept in multiple languages
- {% diff %} for before/after code comparisons
- {% compare %} for side-by-side code blocks
- {% api %} for REST API endpoint documentation with parameters and responses
- {% symbol %} for type/class/function reference documentation
- {% diagram %} for architecture and flow diagrams (Mermaid syntax)
- {% sandbox %} + {% preview %} for live HTML/CSS/JS demos
- {% steps %} for tutorials and setup guides
- {% tabs %} for platform-specific instructions (npm/yarn/pnpm)`,

	content: `## Content Mode Guidelines

Use editorial and storytelling runes to create engaging content:
- {% hero %} for page introductions with headline + call-to-action links
- {% cta %} for standalone call-to-action sections
- {% feature %} for listing highlights or benefits
- {% timeline %} for chronological narratives or history
- {% changelog %} for release notes and version history
- {% howto %} for step-by-step tutorials with estimated time
- {% recipe %} for recipes with ingredients, steps, and metadata
- {% testimonial %} for quotes with attribution and star ratings
- {% annotate %} for adding margin notes to content
- {% conversation %} for dialogue-style content`,

	marketing: `## Marketing Mode Guidelines

You are creating marketing and business content. Use runes to create polished, structured pages:
- {% hero %} for the page introduction — headline, description, and call-to-action links
- {% feature %} for showcasing product benefits or service highlights
- {% pricing %} with {% tier %} children for pricing tables
- {% testimonial %} for customer quotes with ratings
- {% cta %} for call-to-action sections (newsletter signup, free trial, etc.)
- {% bento %} for feature grids with visual cards
- {% cast %} for team or speaker listings
- {% organization %} for business info (address, hours, contact)
- {% event %} for upcoming events or launches
- {% storyboard %} for visual narratives or process explanations
- {% form %} for contact forms or lead capture
- {% accordion %} or {% details %} for FAQ sections

A typical landing page structure: hero → features → social proof (testimonials) → pricing → CTA. Use this as a starting pattern when asked to create landing pages or marketing pages.`,

	travel: `## Travel Mode Guidelines

Use location and experience runes to create travel content:
- {% map %} for interactive maps with pinned locations and categories
- {% timeline %} for day-by-day itineraries
- {% recipe %} for local cuisine with ingredients and steps
- {% event %} for local events, festivals, or activities
- {% cast %} for travel companions, local guides, or notable people
- {% grid %} for photo galleries or destination comparisons
- {% tabs %} for organizing by day, region, or category`,

	design: `## Design Mode Guidelines

CRITICAL: Raw HTML written as Markdown will NOT render as HTML — Markdoc treats it as plain text. Users will see literal <div>, <section> tags.

When creating UI components, layouts, or visual prototypes, ALWAYS nest a sandbox inside a preview rune. This gives users a rendered preview with source code panel, responsive viewports, and theme toggling:

{% preview source=true responsive="mobile,tablet,desktop" %}
{% sandbox framework="tailwind" %}
<section class="py-20 px-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-center">
  <h1 class="text-5xl font-bold text-white mb-4">Ship faster</h1>
  <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Build beautiful products.</p>
  <div class="flex gap-4 justify-center">
    <a href="#" class="px-6 py-3 bg-white text-indigo-700 rounded-lg font-semibold">Get Started</a>
    <a href="#" class="px-6 py-3 border border-white/30 text-white rounded-lg">Learn More</a>
  </div>
</section>
{% /sandbox %}
{% /preview %}

Use data-source attributes to create separate source code tabs:

{% preview source=true responsive="mobile,tablet,desktop" %}
{% sandbox framework="tailwind" %}
<style data-source="CSS">
  .hero { background: linear-gradient(to bottom right, var(--color-primary), var(--color-secondary)); }
</style>
<section class="hero" data-source="HTML">
  <h1>Headline</h1>
</section>
{% /sandbox %}
{% /preview %}

A bare {% sandbox %} (without preview) is acceptable for small inline demos that do not need source/viewport controls.

### Design tokens in sandbox:

When design tokens are active, they are auto-injected into sandbox iframes as CSS custom properties:
- CSS: var(--font-heading), var(--color-primary), var(--radius-md)
- Tailwind: token names become theme extensions (font-heading, text-primary, rounded-md)
- Prefer token-based values over hardcoded colors/fonts when tokens exist.`,
};

/** Returns mode-specific writing guidance, if any. */
export function getModeGuidance(mode: string): string | undefined {
	return MODE_GUIDANCE[mode];
}

/**
 * Returns the system prompt as two separate parts for cache-aware usage:
 * [0] Base instructions (role description, writing rules) — stable across all modes
 * [1] Rune vocabulary (available runes section) + optional mode guidance — varies by mode
 */
export function generateSystemPromptParts(
	runes: Record<string, RuneInfo>,
	includeRunes?: Set<string>,
	mode?: string,
): [string, string] {
	const runeDescriptions = Object.values(runes)
		.filter(rune => !EXCLUDED_RUNES.has(rune.name))
		.filter(rune => !includeRunes || includeRunes.has(rune.name))
		.map(rune => describeRune(rune))
		.join('\n\n');

	let runeVocab = `## Available Runes\n\n${runeDescriptions}`;

	if (mode) {
		const guidance = MODE_GUIDANCE[mode];
		if (guidance) {
			runeVocab += '\n\n' + guidance;
		}
	}

	return [BASE_INSTRUCTIONS, runeVocab];
}

export function generateSystemPrompt(
	runes: Record<string, RuneInfo>,
	includeRunes?: Set<string>,
	mode?: string,
): string {
	return generateSystemPromptParts(runes, includeRunes, mode).join('\n\n');
}
