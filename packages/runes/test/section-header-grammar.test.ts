import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { RendererNode } from '@refrakt-md/types';
import {
	tags as coreTags,
	nodes as coreNodes,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	serializeTree,
	type ComposedRune,
} from '../src/index.js';
import { baseConfig } from '../src/config.js';

/**
 * ADR-046 / WORK-659 — `section`'s header grammar, anchored to the headline.
 *
 * The fixtures were recorded before the grammar changed, and the change is
 * reviewed as the diff of these snapshots. Each one is a case ADR-046 names:
 * content placed in a `section` that was never written as a header.
 */

function definition(front: string, template: string): string {
	return `---\n${front.trim()}\n---\n\n${template.trim()}\n`;
}

/** `source` rendered to HTML through the schema transform and `baseConfig`. */
function html(source: string, composed: Record<string, ComposedRune> = {}): string {
	const own: Record<string, Schema> = {};
	const runes: Record<string, unknown> = { ...baseConfig.runes };
	for (const [name, c] of Object.entries(composed)) {
		own[name] = c.rune.schema;
		runes[c.typeName] = c.config;
	}
	const tree = Markdoc.transform(Markdoc.parse(source), {
		tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	} as never);
	const engine = createTransform({ ...baseConfig, runes } as never);
	return renderToHtml(engine(serializeTree(tree) as RendererNode) as RendererNode);
}

// SPEC-169 D4's example places each step in a `section`. The shipped
// `fixtures/composed/steps.md` places `textblock`, so this variant is the one
// that exercises `section`.
const stepList = defineComposedRune(
	'step-list',
	definition(
		`
tag: div
content:
  type: sequence
  fields:
    items: { match: "list:ordered" }
`,
		`
{% grid %}
	{% slot name="items" each %}
		{% section %}
			{% slot /%}
		{% /section %}
	{% /slot %}
{% /grid %}
`,
	),
);

// SPEC-161 D1's testimonial, placing its quote and attribution in a `section`.
const quote = defineComposedRune(
	'quote-card',
	definition(
		`
tag: figure
content:
  type: sequence
  fields:
    quote:       { match: paragraph }
    attribution: { match: paragraph, optional: true }
`,
		`
{% section %}
	{% slot name="quote" /%}

	{% slot name="attribution" /%}
{% /section %}
`,
	),
);

// The composed `character`'s shape, placing `section` rather than `card`.
const characterFront = `
tag: article
attributes:
  name: { type: string, required: true }
  role: { type: string, matches: [protagonist, antagonist], default: protagonist }
content:
  type: sequence
  fields:
    description: { match: paragraph, optional: true, greedy: true }
    body:        { match: any, optional: true, greedy: true }
metaFields:
  role: { metaType: category, label: Role }
blocks:
  metadata: { fields: [role], layout: definition-list }
`;

const profile = defineComposedRune(
	'profile',
	definition(
		characterFront,
		`
{% section %}
	# {% $attrs.name %}

	{% metablock name="metadata" /%}

	{% slot name="description" /%}

	{% slot name="body" /%}
{% /section %}
`,
	),
);

const bareProfile = defineComposedRune(
	'bare-profile',
	definition(
		characterFront,
		`
{% section %}
	# {% $attrs.name %}

	{% slot name="description" /%}

	{% slot name="body" /%}
{% /section %}
`,
	),
);

const profileContent = 'A necromancer.\n\nShe discovered her gift young.\n';

describe('section header grammar — the recorded cases (ADR-046)', () => {
	it('a step list placing each step in a section', () => {
		expect(
			html('{% step-list %}\n1. Install it.\n2. Run it.\n{% /step-list %}', {
				'step-list': stepList,
			}),
		).toMatchInlineSnapshot(
			`"<article><div data-rune="step-list" data-density="full"><section class="rf-grid rf-grid--columns" data-mode="columns" data-rune="grid" data-density="full"><div data-layout="grid"><div data-colspan="1" data-name="cell"><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="compact"><div data-name="body" class="rf-section__body" data-section="body"><p data-slot="items">Install it.</p></div></section><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="compact"><div data-name="body" class="rf-section__body" data-section="body"><p data-slot="items">Run it.</p></div></section></div></div></section></div></article>"`,
		);
	});

	it('a quote card placing quote and attribution slots', () => {
		expect(
			html('{% quote-card %}\nIt changed how we ship.\n\nAda, CTO\n{% /quote-card %}', {
				'quote-card': quote,
			}),
		).toMatchInlineSnapshot(
			`"<article><figure data-rune="quote-card" data-density="full"><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="full"><div data-name="body" class="rf-section__body" data-section="body"><p data-slot="quote">It changed how we ship.</p><p data-slot="attribution">Ada, CTO</p></div></section></figure></article>"`,
		);
	});

	it('a character-shaped composition with its metablock', () => {
		expect(
			html(`{% profile name="Veshra" %}\n${profileContent}{% /profile %}`, { profile }),
		).toMatchInlineSnapshot(
			`"<article><article data-role="protagonist" data-rune="profile" data-density="full"><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="full"><header data-name="preamble" class="rf-section__preamble" data-section="preamble"><h1 id="veshra" data-name="headline" class="rf-section__headline" data-section="title">Veshra</h1></header><div data-name="body" class="rf-section__body" data-section="body"><dl data-name="metadata" data-zone="metadata" data-zone-layout="definition-list" class="rf-section__metadata"><div data-name="row" data-field="role" class="rf-section__row"><dt data-meta-label="">Role</dt><dd><span class="rf-badge" data-meta-type="category">protagonist</span></dd></div></dl><p data-slot="description">A necromancer.</p><p data-slot="description">She discovered her gift young.</p></div></section></article></article>"`,
		);
	});

	it('a character-shaped composition without its metablock', () => {
		expect(
			html(`{% bare-profile name="Veshra" %}\n${profileContent}{% /bare-profile %}`, {
				'bare-profile': bareProfile,
			}),
		).toMatchInlineSnapshot(
			`"<article><article data-role="protagonist" data-rune="bare-profile" data-density="full"><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="full"><header data-name="preamble" class="rf-section__preamble" data-section="preamble"><h1 id="veshra" data-name="headline" class="rf-section__headline" data-section="title">Veshra</h1><p data-slot="description" data-name="blurb" class="rf-section__blurb" data-section="description">A necromancer.</p></header><div data-name="body" class="rf-section__body" data-section="body"><p data-slot="description">She discovered her gift young.</p></div></section></article></article>"`,
		);
	});

	it('a standalone section with only paragraphs', () => {
		expect(
			html('{% section %}\nFirst paragraph.\n\nSecond paragraph.\n{% /section %}'),
		).toMatchInlineSnapshot(
			`"<article><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="full"><div data-name="body" class="rf-section__body" data-section="body"><p>First paragraph.</p><p>Second paragraph.</p></div></section></article>"`,
		);
	});

	it('a standalone section with an image and paragraphs', () => {
		expect(
			html('{% section %}\n![A view](view.png)\n\nFirst paragraph.\n\nSecond.\n{% /section %}'),
		).toMatchInlineSnapshot(
			`"<article><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="full"><div data-name="body" class="rf-section__body" data-section="body"><p><img src="view.png" alt="A view" /></p><p>First paragraph.</p><p>Second.</p></div></section></article>"`,
		);
	});

	it('a section with an eyebrow, a heading and a blurb', () => {
		expect(
			html('{% section %}\nKicker\n\n## Heading\n\nThe blurb.\n\nThe body.\n{% /section %}'),
		).toMatchInlineSnapshot(
			`"<article><section class="rf-section rf-section--start" data-align="start" data-rune="section" data-density="full"><header data-name="preamble" class="rf-section__preamble" data-section="preamble"><p data-name="eyebrow" class="rf-section__eyebrow" data-section="eyebrow">Kicker</p><h2 id="heading" data-name="headline" class="rf-section__headline" data-section="title">Heading</h2><p data-name="blurb" class="rf-section__blurb" data-section="description">The blurb.</p></header><div data-name="body" class="rf-section__body" data-section="body"><p>The body.</p></div></section></article>"`,
		);
	});
});

describe('section header attribute (ADR-046 decision 2)', () => {
	const src = (attrs: string) =>
		`{% section ${attrs} %}\nKicker\n\n## Heading\n\nThe blurb.\n{% /section %}`;
	const named = (out: string, name: string) => out.includes(`data-name="${name}"`);

	it('auto, the default, reads eyebrow, headline and blurb', () => {
		const out = html(src('header="auto"'));
		expect(out).toBe(html(src('')));
		expect(named(out, 'eyebrow') && named(out, 'headline') && named(out, 'blurb')).toBe(true);
	});

	it('headline lifts only a leading heading; the paragraph after it stays body', () => {
		const out = html('{% section header="headline" %}\n## Heading\n\nThe text.\n{% /section %}');
		expect(named(out, 'headline')).toBe(true);
		expect(named(out, 'blurb')).toBe(false);
		expect(out).toMatch(/data-name="body"[^>]*><p>The text\.<\/p>/);
	});

	it('headline reads no eyebrow, so content before the heading leaves no header', () => {
		const out = html(src('header="headline"'));
		expect(out).not.toContain('<header');
	});

	it('none reads no header at all', () => {
		const out = html(src('header="none"'));
		expect(out).not.toContain('<header');
		expect(out).toMatch(/data-name="body"[^>]*><p>Kicker<\/p><h2/);
	});

	it('an eyebrow is only a paragraph directly before the headline', () => {
		const out = html('{% section %}\nOne.\n\nTwo.\n\n## Heading\n{% /section %}');
		expect(out).not.toContain('<header');
	});
});

describe('slot-header-role warning (ADR-046 decision 3)', () => {
	function findings(source: string, composed: Record<string, ComposedRune>) {
		const own: Record<string, Schema> = {};
		for (const [name, c] of Object.entries(composed)) own[name] = c.rune.schema;
		const config = {
			tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
			nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
			variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
		};
		return Markdoc.validate(Markdoc.parse(source), config as never)
			.map((f) => f.error)
			.filter((e) => e.id === 'slot-header-role');
	}

	const bare = `{% bare-profile name="Veshra" %}\n${profileContent}{% /bare-profile %}`;

	it('names the composed rune, the slot, the role and both remedies', () => {
		const [finding, ...rest] = findings(bare, { 'bare-profile': bareProfile });
		expect(rest).toHaveLength(0);
		expect(finding.level).toBe('warning');
		expect(finding.message).toBe(
			'slot `description` of `bare-profile` is read as `section`\'s blurb; name the field `blurb`, or set `header="headline"` on the section',
		);
	});

	it('changes nothing that renders', () => {
		// The recorded snapshot above is the same tree with the finding raised.
		expect(html(bare, { 'bare-profile': bareProfile })).toContain(
			'<p data-slot="description" data-name="blurb"',
		);
	});

	it('is not raised when template content sits between the headline and the slot', () => {
		const src = `{% profile name="Veshra" %}\n${profileContent}{% /profile %}`;
		expect(findings(src, { profile })).toEqual([]);
	});

	it('is not raised for a slot named for its role', () => {
		const teaser = defineComposedRune(
			'role-named',
			definition(
				`
tag: div
content:
  type: sequence
  fields:
    headline: { match: heading }
    blurb:    { match: paragraph, optional: true }
`,
				`
{% section %}
	{% slot name="headline" /%}

	{% slot name="blurb" /%}
{% /section %}
`,
			),
		);
		expect(
			findings('{% role-named %}\n## Title\n\nThe blurb.\n{% /role-named %}', {
				'role-named': teaser,
			}),
		).toEqual([]);
	});

	it('is not raised once the section sets header="headline"', () => {
		const fixed = defineComposedRune(
			'fixed-profile',
			definition(
				characterFront,
				`
{% section header="headline" %}
	# {% $attrs.name %}

	{% slot name="description" /%}

	{% slot name="body" /%}
{% /section %}
`,
			),
		);
		expect(
			findings(`{% fixed-profile name="Veshra" %}\nA necromancer.\n{% /fixed-profile %}`, {
				'fixed-profile': fixed,
			}),
		).toEqual([]);
	});

	it('is not raised for the recorded no-heading cases, which now read no header', () => {
		expect(
			findings('{% step-list %}\n1. Install it.\n{% /step-list %}', { 'step-list': stepList }),
		).toEqual([]);
		expect(
			findings('{% quote-card %}\nIt changed.\n\nAda\n{% /quote-card %}', { 'quote-card': quote }),
		).toEqual([]);
	});
});
