import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;

describe('SPEC-054 menubar slot detection', () => {
	it('renders a simple menubar group with no slots (backwards compat)', () => {
		const result = parse(`{% nav layout="menubar" %}
## Product
- features
- pricing
{% /nav %}`);

		const nav = findTag(result as any, t => t.attributes['data-rune'] === 'nav');
		expect(nav).toBeDefined();

		const intros = findAllTags(result as any, t => t.attributes['data-name'] === 'intro');
		const footers = findAllTags(result as any, t => t.attributes['data-name'] === 'footer');
		expect(intros).toHaveLength(0);
		expect(footers).toHaveLength(0);
	});

	it('detects a paragraph before the list as the intro slot', () => {
		const result = parse(`{% nav layout="menubar" %}
## Product
For teams shipping documentation

- features
- pricing
{% /nav %}`);

		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		expect(intro).toBeDefined();
		expect(intro!.name).toBe('div');
		// The intro contains the paragraph
		const para = findTag(intro!, t => t.name === 'p');
		expect(para).toBeDefined();
	});

	it('detects a blockquote intro slot (featured hero pattern)', () => {
		const result = parse(`{% nav layout="menubar" %}
## Docs

> [Refrakt for teams](/teams)
> Featured intro card

- [Getting started](/docs/getting-started)
{% /nav %}`);

		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		expect(intro).toBeDefined();
		const blockquote = findTag(intro!, t => t.name === 'blockquote');
		expect(blockquote).toBeDefined();
	});

	it('detects a paragraph after the list as the footer slot', () => {
		const result = parse(`{% nav layout="menubar" %}
## Docs
Intro paragraph

- [Getting started](/docs/getting-started)

See all docs →
{% /nav %}`);

		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		const footer = findTag(result as any, t => t.attributes['data-name'] === 'footer');
		expect(intro).toBeDefined();
		expect(footer).toBeDefined();
	});

	it('does not promote a single content block to footer (intro only)', () => {
		const result = parse(`{% nav layout="menubar" %}
## Product
Eyebrow text

- features
{% /nav %}`);

		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		const footer = findTag(result as any, t => t.attributes['data-name'] === 'footer');
		expect(intro).toBeDefined();
		expect(footer).toBeUndefined();
	});

	it('a single content block with no lists becomes intro', () => {
		const result = parse(`{% nav layout="menubar" %}
## Standalone
Just some content here, no list.
{% /nav %}`);

		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		expect(intro).toBeDefined();
	});
});

describe('SPEC-054 columns layout flow rule', () => {
	it('renders one column per section when no <hr> (backwards compat)', () => {
		const result = parse(`{% nav layout="columns" %}
## Product
- features

## Resources
- docs
{% /nav %}`);

		// No column wrappers in backwards-compat mode — groups render directly
		const columns = findAllTags(result as any, t => t.attributes['data-name'] === 'column');
		expect(columns).toHaveLength(0);
	});

	it('bucket groups into columns separated by <hr>', () => {
		const result = parse(`{% nav layout="columns" %}
## Product
- features

## Resources
- docs

---

## Community
- forums

## Status
- status-page

---

## Legal
- privacy
{% /nav %}`);

		const columns = findAllTags(result as any, t => t.attributes['data-name'] === 'column');
		expect(columns).toHaveLength(3);

		// First column should contain Product + Resources
		const firstColGroups = findAllTags(columns[0], t => t.attributes['data-rune'] === 'nav-group');
		expect(firstColGroups).toHaveLength(2);

		// Second column should contain Community + Status
		const secondColGroups = findAllTags(columns[1], t => t.attributes['data-rune'] === 'nav-group');
		expect(secondColGroups).toHaveLength(2);

		// Third column should contain Legal alone
		const thirdColGroups = findAllTags(columns[2], t => t.attributes['data-rune'] === 'nav-group');
		expect(thirdColGroups).toHaveLength(1);
	});

	it('headingless columns layout splits flat items at <hr>', () => {
		const result = parse(`{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)
{% /nav %}`);

		const columns = findAllTags(result as any, t => t.attributes['data-name'] === 'column');
		expect(columns).toHaveLength(2);

		const firstColItems = findAllTags(columns[0], t => t.attributes['data-rune'] === 'nav-item');
		expect(firstColItems).toHaveLength(2);

		const secondColItems = findAllTags(columns[1], t => t.attributes['data-rune'] === 'nav-item');
		expect(secondColItems).toHaveLength(2);
	});
});

describe('SPEC-054 strip layout', () => {
	it('renders a flat list of items with data-layout="strip"', () => {
		const result = parse(`{% nav layout="strip" %}
- [Changelog](/releases)
- [Roadmap](https://example.com/roadmap)
- [Status](https://status.example.com)
{% /nav %}`);

		const nav = findTag(result as any, t => t.attributes['data-rune'] === 'nav');
		expect(nav).toBeDefined();
		expect(nav!.attributes['layout']).toBe('strip');

		const items = findAllTags(result as any, t => t.attributes['data-rune'] === 'nav-item');
		expect(items).toHaveLength(3);

		// Strip should NOT have group / column / intro / footer slots
		const groups = findAllTags(result as any, t => t.attributes['data-rune'] === 'nav-group');
		const columns = findAllTags(result as any, t => t.attributes['data-name'] === 'column');
		expect(groups).toHaveLength(0);
		expect(columns).toHaveLength(0);
	});
});

describe('SPEC-054 nested rune content in menubar groups', () => {
	it('accepts a nested {% nav layout="columns" %} inside a menubar group', () => {
		const result = parse(`{% nav layout="menubar" %}
## Docs

{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)
{% /nav %}
{% /nav %}`);

		// Outer nav exists
		const navs = findAllTags(result as any, t => t.attributes['data-rune'] === 'nav');
		expect(navs.length).toBeGreaterThanOrEqual(2);

		// Inner nav uses columns headingless mode → has column wrappers
		const columnsInsideMenubar = navs.find(n => n.attributes['layout'] === 'columns');
		expect(columnsInsideMenubar).toBeDefined();

		const columnDivs = findAllTags(columnsInsideMenubar!, t => t.attributes['data-name'] === 'column');
		expect(columnDivs).toHaveLength(2);
	});

	it('places a lone nested nav in body, not wrapped in an intro slot', () => {
		const result = parse(`{% nav layout="menubar" %}
## Docs

{% nav layout="columns" %}
- [Getting started](/docs/getting-started)

---

- [Themes](/docs/themes/overview)
{% /nav %}
{% /nav %}`);

		// The nested nav alone should not be promoted to intro — it's body content.
		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		expect(intro).toBeUndefined();

		// The nested nav lives directly inside the panel.
		const panel = findTag(result as any, t => t.attributes['data-name'] === 'panel');
		expect(panel).toBeDefined();
		const nestedNav = panel!.children.find(
			(c: any) => c && typeof c === 'object' && c.attributes?.['data-rune'] === 'nav',
		);
		expect(nestedNav).toBeDefined();
	});

	it('with paragraph after a nested nav, the nav stays in body and only the paragraph becomes footer', () => {
		const result = parse(`{% nav layout="menubar" %}
## Docs

{% nav layout="columns" %}
- [Configuration](/docs/configuration/overview)
{% /nav %}

See all docs →
`+ `{% /nav %}`);

		const intro = findTag(result as any, t => t.attributes['data-name'] === 'intro');
		expect(intro).toBeUndefined();

		const footer = findTag(result as any, t => t.attributes['data-name'] === 'footer');
		expect(footer).toBeDefined();
		// The trailing paragraph is in the footer.
		const footerParagraph = findTag(footer!, t => t.name === 'p');
		expect(footerParagraph).toBeDefined();

		// The nested nav stays in the panel body, not inside the footer slot.
		const panel = findTag(result as any, t => t.attributes['data-name'] === 'panel');
		const navInsideFooter = findAllTags(footer!, t => t.attributes['data-rune'] === 'nav');
		expect(navInsideFooter).toHaveLength(0);
		const navInPanelBody = panel!.children.find(
			(c: any) => c && typeof c === 'object' && c.attributes?.['data-rune'] === 'nav',
		);
		expect(navInPanelBody).toBeDefined();
	});
});

describe('SPEC-054 per-item descriptions', () => {
	it('captures a paragraph after a list item as a description child', () => {
		const result = parse(`{% nav %}
- [Plan](/plan)

  Track work, specs, and decisions alongside your docs.

- [Build](/build)

  Author content in plain markdown.
{% /nav %}`);

		const descriptions = findAllTags(result as any, t => t.attributes['data-name'] === 'description');
		expect(descriptions.length).toBeGreaterThanOrEqual(2);
	});

	it('puts the description inside the <a> so the whole item is one click target', () => {
		const result = parse(`{% nav %}
- [Configuration](/docs/configuration)

  Set up sites, plugins, and themes.
{% /nav %}`);

		const description = findTag(result as any, t => t.attributes['data-name'] === 'description');
		expect(description).toBeDefined();
		// Description is a <span>, not a <p>, so it can live inline inside the link.
		expect(description!.name).toBe('span');

		// The description's text is the description, not the link label.
		const collectText = (node: any): string => {
			if (typeof node === 'string') return node;
			if (!node || typeof node !== 'object') return '';
			return (node.children ?? []).map(collectText).join(' ');
		};
		const descText = collectText(description);
		expect(descText).toContain('Set up sites');
		expect(descText).not.toContain('Configuration');

		// Description is a child of the <a>, not a sibling.
		const link = findTag(result as any, t => t.name === 'a');
		expect(link).toBeDefined();
		const descInsideLink = findTag(link!, t => t.attributes['data-name'] === 'description');
		expect(descInsideLink).toBeDefined();
	});
});
