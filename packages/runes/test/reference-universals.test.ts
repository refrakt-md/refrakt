import { describe, it, expect } from 'vitest';
import { describeRune, serializeRune, hydrateRuneInfo, UNIVERSAL_ATTRIBUTE_NAMES, runes, describeSchemaUniversals, AXIS_ATTRIBUTES } from '../src/index.js';
import type { RuneInfo } from '../src/reference.js';
import type { Schema } from '@markdoc/markdoc';

// WORK-535 / SPEC-125 — `refrakt reference card` used to print all 37 universal
// attributes under the heading "available on every rune". On a card, several of
// them do nothing. The CLI stated as fact something false about the rune it was
// describing, which is the symptom that opened SPEC-125.
//
// The correction has to hold in three places at once — the human markdown, the
// `--format json` payload, and the hoisted section in `reference dump` — because
// an author who checks the one the fix missed is back where they started.

/** Hydrate a real core rune the way the reference command does. */
function info(name: string): RuneInfo {
	const rune = (runes as Record<string, { name: string; schema: Schema; aliases: string[]; description: string }>)[name];
	if (!rune) throw new Error(`no such rune: ${name}`);
	return hydrateRuneInfo(rune as never, { pluginName: 'core' });
}

describe('the blanket claim is gone', () => {
	it('no rune reference asserts availability on every rune', () => {
		for (const name of ['card', 'grid', 'textblock', 'badge']) {
			expect(describeRune(info(name)), name).not.toContain('available on every rune');
		}
	});
});

describe('what is reported is what the schema carries', () => {
	it('lists a rune\'s real universal attributes, not the static set', () => {
		const grid = describeRune(info('grid'));
		// `grid` arranges children — no body, no header, no media surface.
		expect(grid).toContain('Universal attributes: ');
		// Note `scrim*` is deliberately absent from this list: it belongs to the
		// `bg` axis, which every rune has — the background layer builds a scrim on
		// any rune, and cover mode only reroutes it (WORK-536).
		for (const absent of ['reading', 'dropcap', 'prominence', 'frame-aspect']) {
			expect(grid, `grid should not advertise \`${absent}\``).not.toMatch(
				new RegExp(`Universal attributes:[^\\n]*\\b${absent}\\b`),
			);
		}
		// …while the axes it can act on are still offered.
		expect(grid).toMatch(/Universal attributes:[^\n]*\btint\b/);
		expect(grid).toMatch(/Universal attributes:[^\n]*\bwidth\b/);
	});

	it('names the reason for each axis it leaves out', () => {
		// The design choice this item posed: vanish, or explain? Reference output
		// is a teaching surface, and "why is `reading` on textblock but not grid?"
		// is exactly what a bare omission leaves unanswered.
		const grid = describeRune(info('grid'));
		expect(grid).toContain('Not applicable to this rune:');
		expect(grid).toMatch(/reading.*: this rune declares no body section/);
		expect(grid).toMatch(/prominence: this rune has no page-section header/);
	});

	it('explains an inline rune by its posture, not by its anatomy', () => {
		// `badge` is inline. A structural reason ("declares no body section")
		// would be technically true and entirely beside the point.
		const badge = describeRune(info('badge'));
		expect(badge).not.toContain('Universal attributes:');
		expect(badge).toMatch(/this rune is inline/);
		expect(badge).not.toMatch(/declares no body section/);
	});

	it('reports a rune that does carry a gated axis', () => {
		// The converse — over-narrowing the *report* would be its own false claim.
		const textblock = describeRune(info('textblock'));
		expect(textblock).toMatch(/Universal attributes:[^\n]*\breading\b/);
		expect(textblock).toMatch(/Universal attributes:[^\n]*\bdropcap\b/);
	});
});

describe('json and markdown agree', () => {
	it('the JSON universal set matches the schema, and carries the same reasons', () => {
		for (const name of ['card', 'grid', 'textblock', 'badge']) {
			const runeInfo = info(name);
			const json = serializeRune(runeInfo, 'core');
			const declared = new Set(Object.keys(runeInfo.schema.attributes ?? {}));

			// Every reported universal attribute is really on the schema…
			for (const attr of json.attributes.universal) {
				expect(declared.has(attr), `${name}: JSON reports \`${attr}\` which the schema lacks`).toBe(true);
			}
			// …and every universal attribute on the schema is reported.
			for (const attr of declared) {
				if (!UNIVERSAL_ATTRIBUTE_NAMES.has(attr)) continue;
				expect(json.attributes.universal, `${name}: schema has \`${attr}\`, JSON omits it`).toContain(attr);
			}

			// The unavailable axes name attributes the schema really lacks.
			for (const { axis, reason, attributes } of json.attributes.universalUnavailable) {
				expect(reason.length, `${name}/${axis}: empty reason`).toBeGreaterThan(0);
				for (const attr of attributes) {
					expect(declared.has(attr), `${name}: \`${axis}\` called unavailable but \`${attr}\` is declared`).toBe(false);
				}
			}

			// And the human output reports the same axes as missing.
			const markdown = describeRune(runeInfo);
			for (const { axis } of json.attributes.universalUnavailable) {
				expect(markdown, `${name}: markdown omits \`${axis}\` from its not-applicable list`).toContain(axis);
			}
		}
	});
});

describe('the schema is authoritative over the rule', () => {
	it('an axis the schema carries is never reported unavailable', () => {
		// `describeSchemaUniversals` explains absences using the applicability
		// rule, but reads availability off the schema. If the two ever disagreed,
		// the tool would be back to contradicting the rune it describes — so the
		// reconciliation, not just the rule, is what is pinned here.
		for (const name of Object.keys(runes as Record<string, unknown>)) {
			let runeInfo: RuneInfo;
			try { runeInfo = info(name); } catch { continue; }
			const schema = runeInfo.schema as Schema;
			const declared = new Set(Object.keys(schema.attributes ?? {}));
			for (const { axis } of describeSchemaUniversals(schema).unavailable) {
				for (const attr of AXIS_ATTRIBUTES[axis] ?? []) {
					expect(declared.has(attr), `${name}: \`${axis}\` reported unavailable while \`${attr}\` is declared`).toBe(false);
				}
			}
		}
	});
});
