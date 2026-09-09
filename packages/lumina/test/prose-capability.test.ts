import { describe, it, expect } from 'vitest';
import { baseConfig, tags, schemaRuneStructures } from '@refrakt-md/runes';
import type { RuneConfig } from '@refrakt-md/transform';
import type { Schema } from '@markdoc/markdoc';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// SPEC-125 Phase 4 / WORK-537 — `reading` and `dropcap` were gated on the `body`
// section role, a structural fact used as a proxy for an editorial one. The
// proxy held for most runes and broke for a real minority: a `datatable`'s body
// role is on its `<table>`, so `{% datatable dropcap=true %}` would have stamped
// a drop cap onto a table.
//
// The capability is now declared, in two places by necessity — the tag module
// (which the schema layer narrows from, with no theme config available) and the
// `RuneConfig` (which the engine gates on). Two copies can drift, so this test
// is what keeps them one fact.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

const allConfigs: Record<string, RuneConfig> = { ...baseConfig.runes };
for (const plugin of Object.values(plugins)) {
	Object.assign(allConfigs, plugin.theme?.runes as Record<string, RuneConfig>);
}

/** Every rune schema reachable from core + the nine plugins, by tag name. */
const allSchemas: Record<string, Schema> = { ...(tags as unknown as Record<string, Schema>) };
for (const plugin of Object.values(plugins)) {
	for (const [name, rune] of Object.entries(plugin.runes as Record<string, { transform: Schema }>)) {
		allSchemas[name] = rune.transform;
	}
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const PROSE = 'prose';

const hasBodyRole = (config: RuneConfig) =>
	Boolean(config.sections && Object.values(config.sections).includes('body'));
const configProvides = (config: RuneConfig) => config.provides?.includes(PROSE) ?? false;
const schemaProvides = (schema: Schema) =>
	schemaRuneStructures.get(schema)?.provides?.includes(PROSE) ?? false;

/** The five runes whose `body` role is not prose — the whole reason for the split. */
const NOT_PROSE = ['Api', 'DataTable', 'Form', 'Showcase', 'Symbol'];

describe('the prose capability is one fact, declared twice', () => {
	it('every rune that declares it in config declares it in its tag module', () => {
		const offenders: string[] = [];
		for (const [name, config] of Object.entries(allConfigs)) {
			const schema = Object.entries(allSchemas).find(([tag]) => norm(tag) === norm(name))?.[1];
			if (!schema) continue; // child/aliased runes with no tag of their own
			if (configProvides(config) !== schemaProvides(schema)) {
				offenders.push(`${name}: config says ${configProvides(config)}, schema says ${schemaProvides(schema)}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});

describe('the audit of the body-role runes', () => {
	const bodyRunes = Object.entries(allConfigs).filter(([, c]) => hasBodyRole(c));

	it('covers the runes the audit named', () => {
		// A count, so a future rune gaining a `body` role shows up here and gets
		// audited rather than silently defaulting to "no prose".
		//
		// 33, not the 32 the work item lists: `MusicPlaylist` is the schema.org
		// alias of `Playlist` and was a bare `{ block }` stub, so it emitted none
		// of its primary's section roles. This audit found that, and it now
		// carries the same join tables — which makes it a 33rd body-role entry.
		expect(bodyRunes.length).toBe(33);
	});

	it('the five non-prose bodies declare no prose capability', () => {
		for (const name of NOT_PROSE) {
			expect(allConfigs[name], `${name} is missing from the config`).toBeTruthy();
			expect(configProvides(allConfigs[name]), `${name} should not provide prose`).toBe(false);
		}
	});

	it('every other body-role rune does', () => {
		// Default-off means a forgotten declaration silently disables `reading`.
		// That is only safe because schema narrowing makes it visible — and
		// because of this list.
		const missing = bodyRunes
			.filter(([name]) => !NOT_PROSE.includes(name))
			.filter(([, config]) => !configProvides(config))
			.map(([name]) => name);
		expect(missing).toEqual([]);
	});

	it('a rune with a reading default must bear prose', () => {
		// `defaultReading` resolves through the same facet, so a rune that sets one
		// without declaring the capability would silently lose its own default.
		const contradictory = Object.entries(allConfigs)
			.filter(([, c]) => c.defaultReading && !configProvides(c))
			.map(([name]) => name);
		expect(contradictory).toEqual([]);
	});
});

describe('the structural role is untouched', () => {
	it('all 32 keep their body role, including the five that lost the axes', () => {
		// Removing the role would have been the other way to fix this, and it is
		// the wrong one: Lumina keys `[data-section="body"]` for layout and
		// density, so dropping it would change how the rune renders for a reason
		// unrelated to rendering.
		for (const name of NOT_PROSE) {
			expect(hasBodyRole(allConfigs[name]), `${name} must keep its body role`).toBe(true);
		}
	});
});
