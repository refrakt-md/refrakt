import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import {
	assembleThemeConfig,
	createTransform,
	generateStructureContract,
} from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import {
	tags as coreTags,
	nodes as coreNodes,
	baseConfig,
	collectCompositions,
	compositionFor,
	createComponentRenderable,
	createContentModelSchema,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	describeRune,
	hydrateRuneInfo,
	serializeTree,
	type ComposedRune,
} from '../src/index.js';
import { registerPlaceable } from '../src/composed-rune.js';
import { CompositionError } from '../src/lib/composition-errors.js';

/**
 * SPEC-145 D14, D24, D31, D33 — where a composed rune's universal attributes
 * land (WORK-661, WORK-662).
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const def = (front: string, template: string) =>
	`---\n${front.trim()}\n---\n\n${template.trim()}\n`;

const BODY = `content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }`;

function config(extra: Record<string, ComposedRune>) {
	const own: Record<string, Schema> = {};
	for (const [name, c] of Object.entries(extra)) own[name] = c.rune.schema;
	return {
		tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	};
}

/** The page through the identity transform. */
function render(source: string, extra: Record<string, ComposedRune> = {}): Json {
	const tree = serializeTree(Markdoc.transform(Markdoc.parse(source), config(extra) as never));
	const pluginRunes: Record<string, RuneConfig> = {};
	for (const c of Object.values(extra)) pluginRunes[c.typeName] = c.config;
	const { config: theme } = assembleThemeConfig({ coreConfig: baseConfig, pluginRunes });
	return createTransform(theme)(tree as never);
}

function validate(source: string, extra: Record<string, ComposedRune>) {
	return Markdoc.validate(Markdoc.parse(source), config(extra) as never).map((e) => e.error);
}

function find(node: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] {
	if (Array.isArray(node)) {
		for (const c of node) find(c, pred, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (pred(node)) out.push(node);
	for (const c of node.children ?? []) find(c, pred, out);
	return out;
}
const byRune = (tree: Json, rune: string) =>
	find(tree, (n) => n.attributes?.['data-rune'] === rune);

/** A rune's own output, less the classes and markers a composition adds. */
function ownAttributes(n: Json): Record<string, unknown> {
	const { 'data-owner': _o, 'data-slot': _s, ...rest } = n.attributes;
	return rest;
}

function compileError(name: string, source: string): CompositionError {
	try {
		defineComposedRune(name, source);
	} catch (e) {
		return e as CompositionError;
	}
	throw new Error('expected the definition to be rejected');
}

const panel = defineComposedRune(
	'panel',
	def(
		`tag: div\n${BODY}`,
		`{% section %}
{% slot name="body" /%}
{% /section %}`,
	),
);

describe('the paint group lands on the carrier (D14)', () => {
	const PAINT = 'elevation="raised" substrate="dots" reveal="fade" tint="warm" tint-mode="dark"';

	it('moves elevation, substrate, reveal and tint to the single placed rune', () => {
		const out = render(`{% panel ${PAINT} %}\n## Title\n\nBody.\n{% /panel %}`, { panel });
		const [root] = byRune(out, 'panel');
		const [section] = byRune(root, 'section');
		for (const attr of ['data-elevation', 'data-substrate', 'data-reveal', 'data-tint']) {
			expect(root.attributes[attr], attr).toBeUndefined();
			expect(section.attributes[attr], attr).toBeDefined();
		}
		expect(section.attributes['data-elevation']).toBe('raised');
	});

	it('keeps width, spacing and inset on the root', () => {
		const out = render(
			'{% panel width="wide" spacing="tight" inset="flush" %}\n## Title\n{% /panel %}',
			{ panel },
		);
		const [root] = byRune(out, 'panel');
		const [section] = byRune(root, 'section');
		expect(root.attributes['data-width']).toBe('wide');
		expect(root.attributes['data-spacing']).toBe('tight');
		expect(root.attributes['data-inset']).toBe('flush');
		for (const attr of ['data-width', 'data-spacing', 'data-inset']) {
			expect(section.attributes[attr], attr).toBeUndefined();
		}
	});

	it('the carrier renders exactly as the rune written directly', () => {
		const composed = render(`{% panel ${PAINT} %}\n## Title\n\nBody.\n{% /panel %}`, { panel });
		const direct = render(`{% section ${PAINT} %}\n## Title\n\nBody.\n{% /section %}`);
		const [placed] = byRune(byRune(composed, 'panel')[0], 'section');
		const [written] = byRune(direct, 'section');
		expect(ownAttributes(placed)).toEqual(ownAttributes(written));
	});
});

describe('the `chrome` marker (D31)', () => {
	const marked = defineComposedRune(
		'marked',
		def(
			`tag: div\n${BODY}`,
			`{% hint type="note" %}
Lead
{% /hint %}

{% section chrome %}
{% slot name="body" /%}
{% /section %}`,
		),
	);

	it('nominates a rune among several at the top level', () => {
		const out = render('{% marked elevation="raised" %}\nBody.\n{% /marked %}', { marked });
		const [root] = byRune(out, 'marked');
		expect(byRune(root, 'section')[0].attributes['data-elevation']).toBe('raised');
		expect(byRune(root, 'hint')[0].attributes['data-elevation']).not.toBe('raised');
	});

	it('is consumed at expansion: not on the placed rune, not in the HTML', () => {
		const out = render('{% marked elevation="raised" %}\nBody.\n{% /marked %}', { marked });
		expect(JSON.stringify(out)).not.toContain('chrome');
	});

	it('changes nothing on a template with one top-level rune', () => {
		const one = defineComposedRune(
			'one-marked',
			def(`tag: div\n${BODY}`, '{% section chrome %}\n{% slot name="body" /%}\n{% /section %}'),
		);
		const a = render('{% one-marked elevation="raised" %}\nx\n{% /one-marked %}', {
			'one-marked': one,
		});
		const b = render('{% panel elevation="raised" %}\nx\n{% /panel %}', { panel });
		expect(ownAttributes(byRune(a, 'section')[0])).toEqual(ownAttributes(byRune(b, 'section')[0]));
	});
});

describe('what a template cannot do (D14, D31)', () => {
	it('rejects several top-level runes and no marker, offering both remedies', () => {
		const e = compileError(
			'two-tops',
			def(
				`tag: div\n${BODY}`,
				'{% hint type="note" %}\nx\n{% /hint %}\n\n{% section %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		expect(e.code).toBe('chrome-ambiguous');
		expect(e.message).toContain('`{% hint %}`');
		expect(e.message).toContain('`{% section %}`');
		expect(e.message).toContain('Wrap them in one `{% section %}`');
		expect(e.message).toContain('mark one with `chrome`');
	});

	it('rejects two marked runes, naming both', () => {
		const e = compileError(
			'two-marks',
			def(
				`tag: div\n${BODY}`,
				'{% hint type="note" chrome %}\nx\n{% /hint %}\n\n{% section chrome %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		expect(e.code).toBe('chrome-marked-twice');
		expect(e.message).toContain('`{% hint %}` and `{% section %}`');
	});

	it('rejects a marker with a value', () => {
		const e = compileError(
			'valued-mark',
			def(
				`tag: div\n${BODY}`,
				'{% section chrome="yes" %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		expect(e.code).toBe('chrome-invalid');
	});

	it('reports a placeable rune declaring a `chrome` attribute as a collision', () => {
		const chromey = createContentModelSchema({
			attributes: { chrome: { type: String, required: false } },
			contentModel: { type: 'sequence', fields: [] },
			transform: () => createComponentRenderable({ rune: 'chromey', tag: 'div', children: [] }),
		});
		registerPlaceable('chromey', { schema: chromey });
		const e = compileError(
			'over-chromey',
			def(`tag: div\n${BODY}`, '{% chromey /%}\n\n{% slot name="body" /%}'),
		);
		expect(e.code).toBe('chrome-collision');
		expect(e.message).toContain('chromey');
	});

	it('counts the runes inside an `{% if %}` as written (D30 is not built)', () => {
		const e = compileError(
			'if-branches',
			def(
				`tag: div\nattributes:\n  lead: { type: boolean, default: false }\n${BODY}`,
				'{% if $attrs.lead %}\n{% hint type="note" %}\nx\n{% /hint %}\n{% /if %}\n\n{% section %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		expect(e.code).toBe('chrome-ambiguous');
	});
});

describe('resolution descends through compositions (D24)', () => {
	const shell = defineComposedRune(
		'shell',
		def(`tag: div\n${BODY}`, '{% panel %}\n{% slot name="body" /%}\n{% /panel %}'),
	);

	it('lands on the first rune with a block, exactly as written on it directly', () => {
		const PAINT = 'elevation="raised" tint="warm" prominence="display"';
		const chained = render(`{% shell ${PAINT} %}\n## Title\n\nBody.\n{% /shell %}`, {
			panel,
			shell,
		});
		const direct = render(`{% section ${PAINT} %}\n## Title\n\nBody.\n{% /section %}`);
		const [outer] = byRune(chained, 'shell');
		const [inner] = byRune(outer, 'panel');
		const [placed] = byRune(inner, 'section');
		expect(outer.attributes['data-elevation']).toBeUndefined();
		expect(inner.attributes['data-elevation']).toBeUndefined();
		expect(ownAttributes(placed)).toEqual(ownAttributes(byRune(direct, 'section')[0]));
	});
});

describe('a composition that places no rune (D24)', () => {
	const bare = defineComposedRune('bare', def(`tag: div\n${BODY}`, '{% slot name="body" /%}'));

	it('warns and drops the paint group rather than painting its root', () => {
		const src = '{% bare elevation="raised" %}\nBody.\n{% /bare %}';
		const warnings = validate(src, { bare }).filter((e) => e.id === 'composition-no-carrier');
		expect(warnings).toHaveLength(1);
		expect(warnings[0].level).toBe('warning');
		expect(warnings[0].message).toContain('`elevation`');
		expect(byRune(render(src, { bare }), 'bare')[0].attributes['data-elevation']).toBeUndefined();
	});
});

describe('role-bound axes land on the role owner (D33)', () => {
	it('`prominence` on a composition placing one section scales its title as on the section', () => {
		const composed = render('{% panel prominence="display" %}\n## Title\n{% /panel %}', { panel });
		const direct = render('{% section prominence="display" %}\n## Title\n{% /section %}');
		const [placed] = byRune(byRune(composed, 'panel')[0], 'section');
		expect(placed.attributes['data-prominence']).toBe('display');
		expect(ownAttributes(placed)).toEqual(ownAttributes(byRune(direct, 'section')[0]));
	});

	it('offers a role-bound axis only when an owner resolves, and records why not', () => {
		const split = defineComposedRune(
			'split-owners',
			def(
				`tag: div\n${BODY}`,
				`{% grid chrome %}
{% section %}
## A
{% /section %}

{% section %}
{% slot name="body" /%}
{% /section %}
{% /grid %}`,
			),
		);
		const attributes = Object.keys(split.rune.schema.attributes ?? {});
		expect(attributes).not.toContain('prominence');
		expect(attributes).toContain('elevation');
		const axes = compositionFor(split.rune.schema)!.axes;
		expect(axes.prominence.unavailable).toMatch(/several runes .* own a page-section header/);
		expect(axes.elevation).toMatchObject({ placement: 'carrier', rune: 'grid' });
		expect(axes.width).toEqual({ placement: 'root' });
	});

	it('places an axis whole: every attribute it owns lands on the same rune', () => {
		const out = render(
			'{% panel frame="polaroid" frame-aspect="4/3" tint="warm" tint-mode="dark" %}\n## Title\n{% /panel %}',
			{ panel },
		);
		const [root] = byRune(out, 'panel');
		const html = JSON.stringify(root.attributes);
		expect(html).not.toContain('frame');
		expect(html).not.toContain('tint');
	});
});

describe('`scrim` follows `bg` to the carrier (D33)', () => {
	it('accepts a background and a scrim with no media, on the carrier', () => {
		const src = '{% panel bg="/hero.jpg" scrim="bottom" %}\n## Title\n{% /panel %}';
		expect(validate(src, { panel }).filter((e) => e.level !== 'warning')).toEqual([]);
		const [root] = byRune(render(src, { panel }), 'panel');
		const [section] = byRune(root, 'section');
		expect(JSON.stringify(root.attributes)).not.toContain('scrim');
		expect(JSON.stringify(section)).toContain('scrim');
	});

	it('warns, naming both, when the rune in cover mode is not the carrier', () => {
		const covered = defineComposedRune(
			'covered',
			def(
				`tag: div\n${BODY}`,
				`{% section chrome %}
{% slot name="body" /%}
{% /section %}

{% card media-position="cover" %}
![x](/x.png)

---

Caption
{% /card %}`,
			),
		);
		const warnings = validate('{% covered scrim="bottom" %}\nx\n{% /covered %}', {
			covered,
		}).filter((e) => e.id === 'composition-scrim-cover');
		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toContain('`section`');
		expect(warnings[0].message).toContain('`card`');
	});
});

describe('`contracts` records each placement, and why an axis is not offered (D33)', () => {
	it('settles a composed rune’s axes by placement rather than by its root', () => {
		const pluginRunes = { [panel.typeName]: panel.config };
		const { config: theme } = assembleThemeConfig({ coreConfig: baseConfig, pluginRunes });
		const contract = generateStructureContract(theme, {
			compositions: collectCompositions({ panel: panel.rune }),
		});
		const entry = contract.runes[panel.typeName];
		expect(entry.composition?.placements).toMatchObject({
			width: { placement: 'root' },
			elevation: { placement: 'carrier', rune: 'section' },
			prominence: { placement: 'header', rune: 'section' },
			frame: { placement: 'media', rune: 'section' },
		});
		// The root's own config has no header, but the placed section does.
		expect(entry.universalAxes?.unavailable?.prominence).toBeUndefined();
	});
});

describe('a definition declares defaults for universal axes (D34)', () => {
	const hero = defineComposedRune(
		'hero-ish',
		def(
			`tag: div
defaults:
  width: full
  elevation: flush
  prominence: display
  density: compact
${BODY}`,
			`{% section %}
{% slot name="body" /%}
{% /section %}`,
		),
	);
	const run = (attrs: string) => {
		const out = render(`{% hero-ish ${attrs} %}\n## Title\n{% /hero-ish %}`, { 'hero-ish': hero });
		const [root] = byRune(out, 'hero-ish');
		return { root, section: byRune(root, 'section')[0] };
	};

	it('lands each default where the author’s attribute would', () => {
		const { root, section } = run('');
		expect(root.attributes['data-width']).toBe('full');
		expect(section.attributes['data-width']).toBeUndefined();
		expect(section.attributes['data-elevation']).toBe('flush');
		expect(section.attributes['data-prominence']).toBe('display');
		expect(section.attributes['data-density']).toBe('compact');
		expect(root.attributes['data-elevation']).toBeUndefined();
	});

	it('yields to the author, for a root-placed and a carrier-placed axis', () => {
		const { root, section } = run('width="wide" elevation="raised"');
		expect(root.attributes['data-width']).toBe('wide');
		expect(section.attributes['data-elevation']).toBe('raised');
	});

	it('yields to a template literal, which yields to the author', () => {
		const literal = defineComposedRune(
			'literal-ish',
			def(
				`tag: div\ndefaults:\n  elevation: flush\n${BODY}`,
				'{% section elevation="sunken" %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		const out = (a: string) =>
			byRune(
				render(`{% literal-ish ${a} %}\nx\n{% /literal-ish %}`, { 'literal-ish': literal }),
				'section',
			)[0].attributes['data-elevation'];
		expect(out('')).toBe('sunken');
		expect(out('elevation="raised"')).toBe('raised');
		expect(compositionFor(literal.rune.schema)!.defaults!.elevation).toEqual({
			value: 'flush',
			placement: 'carrier',
			rune: 'section',
			literal: 'sunken',
		});
	});

	it('rejects a key that is no universal axis, and a value its axis does not accept', () => {
		const own = compileError(
			'own-default',
			def(`tag: div\ndefaults:\n  tone: warm\n${BODY}`, '{% slot name="body" /%}'),
		);
		expect(own.code).toBe('defaults-invalid');
		expect(own.message).toContain('`tone`');
		const bad = compileError(
			'bad-default',
			def(
				`tag: div\ndefaults:\n  elevation: towering\n${BODY}`,
				'{% section %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		expect(bad.code).toBe('defaults-invalid');
		expect(bad.message).toContain('towering');
		const density = compileError(
			'bad-density',
			def(
				`tag: div\ndefaults:\n  density: airy\n${BODY}`,
				'{% section %}\n{% slot name="body" /%}\n{% /section %}',
			),
		);
		expect(density.code).toBe('defaults-invalid');
	});

	it('`reference` documents the defaults', () => {
		const text = describeRune(hydrateRuneInfo(hero.rune));
		expect(text).toContain('Defaults');
		expect(text).toContain('width: full');
		expect(text).toContain('elevation: flush on `section`');
	});

	it('does not offer `density` to authors', () => {
		expect(Object.keys(hero.rune.schema.attributes ?? {})).not.toContain('density');
		expect(Object.keys(coreTags.section.attributes ?? {})).not.toContain('density');
	});
});
