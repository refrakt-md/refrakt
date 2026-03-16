import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { parse, findTag, findAllTags } from './helpers.js';

/**
 * These tests verify that the content-model-based hero rune produces the
 * expected structural output.  They exercise the resolver + transform path
 * across various content configurations.
 */
describe('hero content model', () => {
	// Helper: find a child tag with a specific `data-field` attribute
	function findProperty(root: Tag, prop: string): Tag | undefined {
		return findTag(root, t => t.attributes['data-field'] === prop);
	}

	// -----------------------------------------------------------------
	// Basic structure
	// -----------------------------------------------------------------

	it('produces a section tag with typeof Hero', () => {
		const result = parse(`{% hero %}
# Welcome
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();
		expect(hero!.name).toBe('section');
		expect(hero!.attributes['data-field']).toBe('content-section');
	});

	// -----------------------------------------------------------------
	// Field extraction — eyebrow, headline, blurb
	// -----------------------------------------------------------------

	it('resolves eyebrow, headline, and blurb from sequence', () => {
		const result = parse(`{% hero %}
Short eyebrow.

# Main Headline

Supporting blurb text.
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();

		// eyebrow, headline, blurb are child tags with property attributes
		expect(findProperty(hero!, 'eyebrow')).toBeDefined();
		expect(findProperty(hero!, 'headline')).toBeDefined();
		expect(findProperty(hero!, 'blurb')).toBeDefined();
	});

	it('skips optional eyebrow when heading comes first', () => {
		const result = parse(`{% hero %}
# Headline Only

Some blurb.
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();
		expect(findProperty(hero!, 'eyebrow')).toBeUndefined();
		expect(findProperty(hero!, 'headline')).toBeDefined();
		expect(findProperty(hero!, 'blurb')).toBeDefined();
	});

	it('handles headline with no blurb or eyebrow', () => {
		const result = parse(`{% hero %}
# Just a Headline
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();
		expect(findProperty(hero!, 'headline')).toBeDefined();
		expect(findProperty(hero!, 'eyebrow')).toBeUndefined();
		expect(findProperty(hero!, 'blurb')).toBeUndefined();
	});

	// -----------------------------------------------------------------
	// Actions — link lists and code fences
	// -----------------------------------------------------------------

	it('transforms list items into link items', () => {
		const result = parse(`{% hero %}
# Title

- [Get Started](/start)
- [Learn More](/docs)
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const linkItems = findAllTags(hero!, t => t.name === 'li' && t.attributes['data-name'] === 'action');
		expect(linkItems.length).toBe(2);

		// Check the link URL
		const link = findTag(hero!, t => t.name === 'a' && t.attributes.href === '/start');
		expect(link).toBeDefined();
	});

	it('transforms code fences into command elements', () => {
		const result = parse(`{% hero %}
# Install Now

\`\`\`shell
npm create refrakt
\`\`\`
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const command = findTag(hero!, t => t.name === 'div' && t.attributes['data-name'] === 'command');
		expect(command).toBeDefined();
	});

	it('handles mixed list and fence actions in any order', () => {
		// Fence before list
		const result1 = parse(`{% hero %}
# Title

\`\`\`shell
npm create refrakt
\`\`\`

- [Docs](/docs)
{% /hero %}`);

		const hero1 = findTag(result1 as any, t => t.attributes['data-rune'] === 'hero');
		expect(findTag(hero1!, t => t.name === 'div' && t.attributes['data-name'] === 'command')).toBeDefined();
		expect(findTag(hero1!, t => t.name === 'li' && t.attributes['data-name'] === 'action')).toBeDefined();

		// List before fence
		const result2 = parse(`{% hero %}
# Title

- [Docs](/docs)

\`\`\`shell
npm create refrakt
\`\`\`
{% /hero %}`);

		const hero2 = findTag(result2 as any, t => t.attributes['data-rune'] === 'hero');
		expect(findTag(hero2!, t => t.name === 'div' && t.attributes['data-name'] === 'command')).toBeDefined();
		expect(findTag(hero2!, t => t.name === 'li' && t.attributes['data-name'] === 'action')).toBeDefined();
	});

	// -----------------------------------------------------------------
	// Delimited zones — media
	// -----------------------------------------------------------------

	it('splits content and media at hr delimiter', () => {
		const result = parse(`{% hero %}
# Welcome

Build something amazing.

---

![Hero image](/images/hero.png)
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();

		// Media zone should contain the image
		const img = findTag(hero!, t => t.name === 'img');
		expect(img).toBeDefined();
		expect(img!.attributes.src).toBe('/images/hero.png');
	});

	it('works without media zone (no delimiter)', () => {
		const result = parse(`{% hero %}
# No Media Hero

Just text content.
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();
		expect(findProperty(hero!, 'headline')).toBeDefined();
	});

	// -----------------------------------------------------------------
	// Attributes — align and SplitLayoutModel
	// -----------------------------------------------------------------

	it('passes align as meta tag', () => {
		const result = parse(`{% hero align="left" %}
# Left-Aligned
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const alignMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === 'left',
		);
		expect(alignMeta).toBeDefined();
	});

	it('defaults align to center', () => {
		const result = parse(`{% hero %}
# Centered
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const alignMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === 'center',
		);
		expect(alignMeta).toBeDefined();
	});

	it('passes layout meta for split layout', () => {
		const result = parse(`{% hero layout="split" %}
# Split Hero

---

![Side image](/images/side.png)
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const layoutMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === 'split',
		);
		expect(layoutMeta).toBeDefined();
	});

	it('includes ratio and valign metas for split layout', () => {
		const result = parse(`{% hero layout="split" ratio="2 1" valign="center" %}
# Split Hero

---

![Side](/images/side.png)
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const ratioMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === '2 1',
		);
		const valignMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === 'center',
		);
		expect(ratioMeta).toBeDefined();
		expect(valignMeta).toBeDefined();
	});

	// -----------------------------------------------------------------
	// Structural wrapping
	// -----------------------------------------------------------------

	it('wraps header in a header element inside content div', () => {
		const result = parse(`{% hero %}
# Title

Description.
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const headerEl = findTag(hero!, t => t.name === 'header');
		expect(headerEl).toBeDefined();

		// Header should be inside a content div
		const contentDiv = findTag(hero!, t =>
			t.name === 'div' && t.attributes['data-name'] === 'content',
		);
		expect(contentDiv).toBeDefined();
	});

	it('wraps actions in a separate div', () => {
		const result = parse(`{% hero %}
# Title

- [Go](/go)
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const actionsDiv = findTag(hero!, t =>
			t.name === 'div' && t.attributes['data-name'] === 'actions',
		);
		expect(actionsDiv).toBeDefined();
	});

	// -----------------------------------------------------------------
	// Deprecated attribute
	// -----------------------------------------------------------------

	it('maps deprecated justify to align', () => {
		const result = parse(`{% hero justify="right" %}
# Right-Aligned
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		const alignMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === 'right',
		);
		expect(alignMeta).toBeDefined();
	});

	// -----------------------------------------------------------------
	// Full hero with all fields
	// -----------------------------------------------------------------

	it('handles a complete hero with all fields populated', () => {
		const result = parse(`{% hero align="center" layout="split" %}
Introducing the Platform

# Build Something Amazing

The modern way to create documentation sites.

- [Get Started](/start)
- [View Docs](/docs)

---

![Platform screenshot](/images/hero.png)
{% /hero %}`);

		const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
		expect(hero).toBeDefined();
		expect(hero!.name).toBe('section');

		// Properties (child tags with property attributes)
		expect(findProperty(hero!, 'eyebrow')).toBeDefined();
		expect(findProperty(hero!, 'headline')).toBeDefined();
		expect(findProperty(hero!, 'blurb')).toBeDefined();

		// Actions
		const linkItems = findAllTags(hero!, t => t.name === 'li' && t.attributes['data-name'] === 'action');
		expect(linkItems.length).toBe(2);

		// Media
		const img = findTag(hero!, t => t.name === 'img');
		expect(img).toBeDefined();

		// Layout metas
		const splitMeta = findTag(hero!, t =>
			t.name === 'meta' && t.attributes.content === 'split',
		);
		expect(splitMeta).toBeDefined();
	});
});
