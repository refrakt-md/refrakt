import { describe, it, expect } from 'vitest';
import { generateStructureContract } from '@refrakt-md/transform';
import type { RuneConfig, ThemeConfig } from '@refrakt-md/transform';
import { baseConfig, tags, UNIVERSAL_ATTRIBUTE_NAMES, AXIS_ATTRIBUTES } from '@refrakt-md/runes';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// SPEC-125 Phase 3 / WORK-534 — the schema and the structure contract are two
// consumers of one question: which universal attributes can affect this rune?
//
// They are derived from the same call — `UniversalAxisFacet.describeForRune` —
// precisely so they cannot answer it differently. This test is what makes that
// claim checkable rather than merely intended: it compares the narrowed Markdoc
// schema against the contract's `unavailable` map, rune by rune, across core and
// all nine plugins.
//
// A divergence here means an author is told one thing by `refrakt reference` and
// another by Markdoc validation, which is the exact failure SPEC-125 exists to
// remove — reintroduced one level up.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

const allRunes: Record<string, RuneConfig> = { ...baseConfig.runes };
for (const plugin of Object.values(plugins)) {
	Object.assign(allRunes, plugin.theme?.runes as Record<string, RuneConfig>);
}
const fullConfig: ThemeConfig = { ...baseConfig, runes: allRunes };
const contract = generateStructureContract(fullConfig);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Every tag whose rune also has a contract entry, paired up. */
function pairs(): Array<{ rune: string; tag: string; attrs: Set<string>; unavailable: Set<string> }> {
	const byNorm = new Map<string, { rune: string; unavailable: Set<string> }>();
	for (const [rune, entry] of Object.entries(contract.runes)) {
		const u = new Set(Object.keys((entry as never as { universalAxes?: { unavailable?: object } }).universalAxes?.unavailable ?? {}));
		byNorm.set(norm(rune), { rune, unavailable: u });
	}
	const out: Array<{ rune: string; tag: string; attrs: Set<string>; unavailable: Set<string> }> = [];
	for (const [tag, schema] of Object.entries(tags)) {
		const hit = byNorm.get(norm(tag));
		if (!hit) continue; // child/aliased tags with no config entry of their own
		out.push({ rune: hit.rune, tag, attrs: new Set(Object.keys((schema as { attributes?: object }).attributes ?? {})), unavailable: hit.unavailable });
	}
	return out;
}

describe('narrowed schemas agree with the structure contract', () => {
	const rows = pairs();

	it('pairs enough runes to be a real check', () => {
		expect(rows.length).toBeGreaterThan(50);
	});

	it('every axis the contract calls unavailable is absent from the schema', () => {
		const offenders: string[] = [];
		for (const { rune, tag, attrs, unavailable } of rows) {
			for (const axis of unavailable) {
				for (const name of AXIS_ATTRIBUTES[axis] ?? []) {
					if (attrs.has(name)) offenders.push(`${rune} (${tag}): contract says \`${axis}\` unavailable, schema still offers \`${name}\``);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it('every axis the contract leaves available is offered by the schema', () => {
		// The converse, and the half that catches over-narrowing — a schema that
		// quietly dropped an applicable attribute would fail an author's valid
		// markup with no explanation anywhere.
		const offenders: string[] = [];
		for (const { rune, tag, attrs, unavailable } of rows) {
			for (const [axis, names] of Object.entries(AXIS_ATTRIBUTES)) {
				if (unavailable.has(axis)) continue;
				for (const name of names) {
					if (!attrs.has(name)) offenders.push(`${rune} (${tag}): contract leaves \`${axis}\` available, schema drops \`${name}\``);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it('the axis→attribute map covers the universal set exactly', () => {
		// `AXIS_ATTRIBUTES` is the one hand-maintained part of the derivation. An
		// attribute owned by no axis could never be narrowed; one owned by two
		// would be narrowed by whichever axis lost.
		const owned = Object.values(AXIS_ATTRIBUTES).flat();
		expect(new Set(owned).size, 'an attribute is owned by two axes').toBe(owned.length);
		expect([...owned].sort()).toEqual([...UNIVERSAL_ATTRIBUTE_NAMES].sort());
	});

	it('narrowing actually happened', () => {
		// A guard on the guard: if every schema still carried all 37 attributes the
		// agreement checks above would pass trivially.
		const narrowed = rows.filter((r) => [...UNIVERSAL_ATTRIBUTE_NAMES].some((a) => !r.attrs.has(a)));
		expect(narrowed.length).toBeGreaterThan(50);
	});
});
