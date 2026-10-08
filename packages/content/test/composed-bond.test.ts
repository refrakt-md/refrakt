import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { defineComposedRune } from '@refrakt-md/runes';
import type { EntityRegistration, Plugin } from '@refrakt-md/types';
import { storytelling } from '../../../plugins/storytelling/src/index.js';
import { assembleMarkdocSchemas } from '../src/site.js';
import {
	all,
	capture,
	composedStorytelling as composedWith,
	definitionOf,
	find,
	fixtureOf,
	html,
	merge,
	renderPage,
	snapshotPath,
	storyTests,
	text,
	without,
	type Json,
} from './composed-storytelling.js';

/**
 * WORK-624 — `bond` as a composed rune: SPEC-145's small worked example, beside
 * the storytelling plugin's `bond` and never in place of it (SPEC-147 D1).
 *
 * The definition lives in `fixtures/composed-storytelling/runes/bond.md`, with
 * its own fixtures beside it. It is exercised through a fixture plugin: the
 * storytelling plugin as shipped, with its `bond` entry swapped for the
 * composed definition. Everything else — `character`, the other entity runes,
 * the cross-linking `postProcess` — is the plugin's own, so the registry the
 * composed `bond` builds can be held against the snapshot the plugin's `bond`
 * was proved against (WORK-612).
 *
 * Two comparisons, the deliverable more than the definition:
 *
 * - **registration**: the composed `bond` reproduces the committed storytelling
 *   registry snapshot exactly — every registration, the name index, the
 *   cross-links and the warnings — and the relationship graph `getRelated`
 *   answers from;
 * - **rendering**: the composed tree is compared with the plugin's, and every
 *   difference is asserted here, each with its reason (SPEC-147 D2).
 */

const relationshipsPath = join(storyTests, 'bond-relationships.json');

const BOND = definitionOf('bond');
const fixture = (scenario: string) => fixtureOf('bond', scenario);

/** The storytelling plugin with `bond` composed. */
const composedStorytelling = (): Plugin => composedWith({ bond: BOND });

afterEach(() => {
	vi.restoreAllMocks();
});

describe('composed bond — registration (SPEC-144, against the storytelling snapshot)', () => {
	it('reproduces the committed storytelling registry snapshot exactly', async () => {
		const { snapshot } = await capture(composedStorytelling());
		const committed = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
		// Compared as text, so key order inside every data bag counts too.
		expect(JSON.stringify(snapshot)).toBe(JSON.stringify(committed));
	});

	it('registers the same edges as the plugin — same from, to and kind', async () => {
		const { snapshot } = await capture(composedStorytelling());
		const committed = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
		const edges = (s: { registrations: EntityRegistration[] }) =>
			s.registrations
				.filter((r) => r.type === 'bond')
				.map((r) => [r.id, r.data.from, r.data.to, r.data.bondType, r.data.bidirectional]);
		expect(edges(snapshot)).toEqual(edges(committed));
		expect(edges(snapshot)).toEqual([
			['Veshra→Aria', 'Veshra', 'Aria', 'rival', 'true'],
			['The Bone Witch→King Edric', 'The Bone Witch', 'King Edric', 'enemy', 'false'],
			['Aria→Nobody', 'Aria', 'Nobody', '', 'true'],
		]);
	});

	it('resolves the recorded bond relationships through getRelated', async () => {
		const { registry, index } = await capture(composedStorytelling());
		const recorded = JSON.parse(readFileSync(relationshipsPath, 'utf-8')) as [string, string][];
		const expected = recorded
			.filter(([from, to]) => index.has(from) && index.has(to))
			.map(([from, to]) => `${index.get(from)!.id} -> ${index.get(to)!.id}`)
			.sort();
		const actual = [...new Set([...index.values()].map((e) => e.id))]
			.flatMap((id) => registry.getRelated(id).map((edge) => `${edge.fromId} -> ${edge.toId}`))
			.sort();
		expect(actual).toEqual(expected);
		expect(registry.getRelated('Veshra', { kind: 'enemy' }).map((e) => e.target.id)).toEqual([
			'King Edric',
		]);
		expect(registry.getRelated('Veshra').map((e) => e.kind)).toEqual(['rival', 'enemy']);
	});

	it('matches the plugin itself on the same site — the control', async () => {
		const plugin = await capture(storytelling);
		const composed = await capture(composedStorytelling());
		expect(composed.snapshot).toEqual(plugin.snapshot);
	});
});

// ---------------------------------------------------------------------------
// Rendering — every difference from the plugin's tree, with its reason
// ---------------------------------------------------------------------------

/** The `bond` a page renders. */
function render(pkg: Plugin, source: string): Json {
	return find(renderPage(pkg, source), (n) => n.attributes?.['data-rune'] === 'bond');
}

/** The same page with `{% hint %}` written by hand — what the template places. */
function handHint(scenario: string, arrow: string): Json {
	const [, from, to] = /from="([^"]*)" to="([^"]*)"/.exec(fixture(scenario))!;
	const body = fixture(scenario).split('\n')[1];
	return find(
		renderPage(
			storytelling,
			`{% hint type="note" %}\n**${from}** ${arrow} **${to}**\n\n${body}\n{% /hint %}\n`,
		),
		(n) => n.attributes?.['data-rune'] === 'hint',
	);
}

/** Each difference below is recorded, with its reason, in WORK-624's resolution. */
describe('composed bond — rendered tree against the plugin (SPEC-147 D2)', () => {
	const scenarios = [
		['canonical', '↔'],
		['one-way', '→'],
		['defaults', '↔'],
	] as const;

	it('records both trees for the canonical fixture', () => {
		const plugin = html(render(storytelling, fixture('canonical')));
		const composed = html(render(composedStorytelling(), fixture('canonical')));
		expect({ plugin, composed }).toMatchInlineSnapshot(`
			{
			  "composed": "<aside data-status="strained" data-rune="bond" data-density="full"><section data-field="content-section" class="rf-hint rf-hint--note" data-hint-type="note" data-elevation="sunken" data-rune="hint" data-density="compact"><div data-name="header" data-zone="header" data-zone-layout="bar" class="rf-hint__header" data-section="header"><span><span data-icon-group="hint" data-icon="note"></span><span data-meta-value="">note</span></span></div><div data-name="body" class="rf-hint__body"><p><strong marker="**">Veshra</strong> ↔ <strong marker="**">Aria</strong></p><p data-slot="body">They grew up together and drifted apart.</p></div></section></aside>",
			  "plugin": "<div class="rf-bond rf-bond--rival rf-bond--strained rf-bond--true" data-bond-type="rival" data-status="strained" data-bidirectional="true" data-elevation="flat" data-rune="bond" data-density="full"><span data-name="from" class="rf-bond__from">Veshra</span><div data-name="connector" class="rf-bond__connector"><span data-name="arrow" class="rf-bond__arrow"></span></div><span data-name="to" class="rf-bond__to">Aria</span><div data-name="body" class="rf-bond__body" data-section="body"><p>They grew up together and drifted apart.</p></div></div>",
			}
		`);
	});

	it.each(scenarios)('%s: identity is the same — data-rune="bond", data-status', (scenario) => {
		const plugin = render(storytelling, fixture(scenario));
		const composed = render(composedStorytelling(), fixture(scenario));
		expect(composed.attributes['data-rune']).toBe(plugin.attributes['data-rune']);
		expect(composed.attributes['data-status']).toBe(plugin.attributes['data-status']);
		expect(composed.attributes['data-density']).toBe(plugin.attributes['data-density']);
	});

	it.each(scenarios)(
		'%s: the placed hint is the hint an author writes by hand, plus data-slot',
		(scenario, arrow) => {
			const composed = render(composedStorytelling(), fixture(scenario));
			const placed = find(composed.children, (n) => n.attributes?.['data-rune'] === 'hint');
			// Compared as HTML: `{% if %}` leaves the arrow as its own text node.
			expect(html(without(placed, 'data-slot'))).toBe(html(handHint(scenario, arrow)));
			// The only slot is the body, and only its content is named.
			expect(all(composed, (n) => n.attributes?.['data-slot'] !== undefined).map(text)).toEqual([
				fixture(scenario).split('\n')[1],
			]);
			expect(html(composed)).not.toMatch(/data-owner/);
		},
	);

	it.each(scenarios)('%s: root element, classes and modifiers', (scenario) => {
		const plugin = render(storytelling, fixture(scenario));
		const composed = render(composedStorytelling(), fixture(scenario));
		// The definition's `tag: aside`, SPEC-145's example.
		expect(plugin.name).toBe('div');
		expect(composed.name).toBe('aside');
		// No block, so no rf-* class anywhere on the rune's own nodes (D2, D2a).
		expect(String(plugin.attributes.class)).toMatch(/^rf-bond rf-bond--/);
		expect(composed.attributes.class).toBeUndefined();
		expect(html(composed)).not.toMatch(/rf-bond/);
		// A generated config makes modifiers of enum attributes only (D2a): `type`
		// is an open vocabulary and `bidirectional` a boolean.
		expect(plugin.attributes).toHaveProperty('data-bond-type');
		expect(plugin.attributes).toHaveProperty('data-bidirectional');
		expect(composed.attributes).not.toHaveProperty('data-bond-type');
		expect(composed.attributes).not.toHaveProperty('data-bidirectional');
		// The plugin config's `defaultElevation: 'flat'` has no counterpart.
		expect(plugin.attributes['data-elevation']).toBe('flat');
		expect(composed.attributes).not.toHaveProperty('data-elevation');
	});

	it.each(scenarios)('%s: endpoints, connector and body', (scenario, arrow) => {
		const plugin = render(storytelling, fixture(scenario));
		const composed = render(composedStorytelling(), fixture(scenario));
		const named = (n: Json) =>
			all(n, (x) => x.attributes?.['data-name'] !== undefined).map(
				(x) => x.attributes['data-name'],
			);
		expect(named(plugin)).toEqual(['from', 'connector', 'arrow', 'to', 'body']);
		// The composed rune names nothing of its own; the names are the hint's.
		expect(named(composed)).toEqual(['header', 'body']);
		// The arrow is a glyph in the text, not an empty span CSS draws.
		const [from, to] = all(composed, (n) => n.name === 'strong').map(text);
		const line = text(find(composed, (n) => n.name === 'p' && n.children?.[0]?.name === 'strong'));
		expect(line).toBe(`${from} ${arrow} ${to}`);
		expect(text(find(plugin, (n) => n.attributes?.['data-name'] === 'arrow'))).toBe('');
		// The body keeps its paragraph; its wrapper and `data-section` go.
		const pluginBody = find(plugin, (n) => n.attributes?.['data-name'] === 'body');
		expect(pluginBody.attributes['data-section']).toBe('body');
		expect(all(composed, (n) => n.attributes?.['data-section'] === 'body')).toEqual([]);
		// The hint brings a visible label the plugin never showed.
		const header = find(composed, (n) => n.attributes?.['data-name'] === 'header');
		expect(text(header)).toBe('note');
	});

	it('accepts the same attributes, except that `status` is now a closed set', () => {
		const attrs = (pkg: Plugin) =>
			Object.keys((assembleMarkdocSchemas(merge(pkg).tags).tags as Json).bond.attributes).sort();
		expect(attrs(composedStorytelling())).toEqual(attrs(storytelling));

		const validate = (pkg: Plugin, src: string) =>
			Markdoc.validate(Markdoc.parse(src), {
				...assembleMarkdocSchemas(merge(pkg).tags),
				variables: {},
			} as never).map((e) => e.error.id);
		const src = '{% bond from="A" to="B" status="estranged" %}x{% /bond %}';
		expect(validate(storytelling, src)).toEqual([]);
		expect(validate(composedStorytelling(), src)).toEqual(['attribute-value-invalid']);
	});
});

// ---------------------------------------------------------------------------
// SPEC-145's worked example, verbatim — why the stored definition differs
// ---------------------------------------------------------------------------

const SPEC_EXAMPLE = `---
tag: aside
attributes:
  from:          { type: string, required: true }
  to:            { type: string, required: true }
  type:          { type: string, default: fellowship }
  status:        { type: string, matches: [active, broken, strained], default: active }
  bidirectional: { type: boolean, default: true }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
registers:
  edge: { from: from, to: to, kind: { field: type } }
---

{% hint type="note" %}
**{% $attrs.from %}** {% if $attrs.bidirectional %}↔{% else /%}→{% /if %} **{% $attrs.to %}**

{% slot name="body" /%}
{% /hint %}
`;

describe("SPEC-145's bond example as written", () => {
	it('is rejected at construction: `kind.field` must name a key of the edge data bag', () => {
		expect(() => defineComposedRune('bond', SPEC_EXAMPLE)).toThrow(
			'Rune "bond": registers: edge.kind.field "type" must name a key of the edge\'s data bag',
		);
	});

	it('with `type` carried in the bag, registers one-way edges only', async () => {
		const amended = SPEC_EXAMPLE.replace(
			'kind: { field: type } }',
			'kind: { field: type }, data: [type] }',
		);
		const pkg = composedStorytelling();
		const { registry } = await capture({
			...pkg,
			runes: { ...pkg.runes, bond: { template: amended } },
		});
		// No `bidirectional` declared means `false`: the plugin's Aria → Veshra
		// reverse edge is not contributed.
		expect(registry.getRelated('Aria').map((e) => e.target.id)).toEqual([]);
		expect(registry.getRelated('Veshra').map((e) => e.target.id)).toEqual(['Aria', 'King Edric']);
	});
});
