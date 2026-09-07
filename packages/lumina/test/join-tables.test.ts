import { describe, it, expect } from 'vitest';
import { schemaRuneStructures, baseConfig, tags } from '@refrakt-md/runes';
import type { RuneConfig } from '@refrakt-md/transform';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// SPEC-125 Phase 2 / WORK-533 — the join tables (`sections`, `mediaSlots`,
// `frameTarget`) now live in the tag modules that own them, with config
// *referencing* the declaration rather than defining it.
//
// The property that matters is identity, not equality: config must point at the
// same object the schema was built with. A copy would satisfy `toEqual` and
// still allow the two to drift, which is exactly the divergence ADR-028 closes.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

const allRunes: Record<string, RuneConfig> = { ...baseConfig.runes };
for (const plugin of Object.values(plugins)) {
	Object.assign(allRunes, plugin.theme?.runes as Record<string, RuneConfig>);
}

/** Every schema the core catalogue registered a structure for, by object. */
function structuresByRune(): Array<[string, RuneConfig, ReturnType<typeof schemaRuneStructures.get>]> {
	const out: Array<[string, RuneConfig, ReturnType<typeof schemaRuneStructures.get>]> = [];
	for (const [name, schema] of Object.entries(tags)) {
		const structure = schemaRuneStructures.get(schema as never);
		if (!structure) continue;
		const key = Object.keys(allRunes).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, ''));
		if (key) out.push([key, allRunes[key], structure]);
	}
	return out;
}

describe('join tables are declared in tag modules', () => {
	it('the schema carries the facts at construction', () => {
		// The whole point of the move: `createContentModelSchema` has the gating
		// facts in hand, with no config lookup and no import cycle.
		const withStructures = structuresByRune();
		expect(withStructures.length).toBeGreaterThan(20);
	});

	it('config references the same object the schema was built with', () => {
		for (const [rune, config, structure] of structuresByRune()) {
			if (structure?.sections) {
				expect(config.sections, `${rune}.sections`).toBe(structure.sections);
			}
			if (structure?.mediaSlots) {
				expect(config.mediaSlots, `${rune}.mediaSlots`).toBe(structure.mediaSlots);
			}
			if (structure?.frameTarget) {
				expect(config.frameTarget, `${rune}.frameTarget`).toBe(structure.frameTarget);
			}
		}
	});

	it('every rune with a section role has it recorded on its schema', () => {
		// The reverse direction: a rune whose config declares `sections` but whose
		// schema never received them would leave the facts unreachable at
		// schema-build time, which is the gap this work closes.
		const missing: string[] = [];
		for (const [name, schema] of Object.entries(tags)) {
			const key = Object.keys(allRunes).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, ''));
			if (!key) continue;
			const config = allRunes[key];
			if (!config?.sections) continue;
			if (!schemaRuneStructures.get(schema as never)?.sections) missing.push(key);
		}
		expect(missing).toEqual([]);
	});

	it('frameTarget resolves from a single source', () => {
		// Figure and Showcase are the only two runes that set it, both to 'self',
		// both with no media section — it grants frame applicability to a rune
		// that would otherwise have none. With `sections` moved and `frameTarget`
		// left behind, config could grant what a narrowed schema forbids.
		const setters = Object.entries(allRunes).filter(([, c]) => c.frameTarget);
		expect(setters.map(([n]) => n).sort()).toEqual(['Figure', 'Showcase']);
		for (const [, config] of setters) expect(config.frameTarget).toBe('self');
	});
});
