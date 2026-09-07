import { describe, it, expect } from 'vitest';
import { lintSectionRoles, declaredSlots, type RuneConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// SPEC-125 Phase 1 / WORK-532 — the standing check.
//
// Twelve slot/role mismatches were found by an ad-hoc script comparing each
// rune's declared slots against its `sections` map. Nothing stopped the same
// drift returning the next time a rune gained a `body` slot. This is that
// script, run over the whole catalogue on every CI run.
//
// It lives here rather than in `packages/transform` because only this package
// can see core *and* all nine plugins at once, which is the scope that matters:
// a plugin rune drifting is exactly as silent as a core one.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

const allRunes: Record<string, RuneConfig> = { ...baseConfig.runes };
for (const plugin of Object.values(plugins)) {
	Object.assign(allRunes, plugin.theme?.runes as Record<string, RuneConfig>);
}

describe('section-role drift', () => {
	it('no rune declares a body or heading slot without a matching role', () => {
		const findings = lintSectionRoles(allRunes);
		// Named in the failure so a regression says which rune and which slot.
		expect(findings.map((f) => `${f.rune}.${f.slot} (${f.kind})`)).toEqual([]);
	});

	it('covers core and all nine plugins', () => {
		// A guard on the guard: if a plugin stops contributing runes here, the
		// check above would pass by looking at less.
		expect(Object.keys(allRunes).length).toBeGreaterThanOrEqual(132);
		for (const [name, plugin] of Object.entries(plugins)) {
			const runes = Object.keys(plugin.theme?.runes ?? {});
			expect(runes.length, `${name} contributed no runes`).toBeGreaterThan(0);
			for (const rune of runes) expect(allRunes).toHaveProperty(rune);
		}
	});

	it('the genuinely bodyless runes produce no noise', () => {
		// The point of the audit was that ~105 runes have neither a body role nor
		// a body slot and are correct as they are. They must stay silent, or the
		// check becomes noise someone learns to ignore.
		const bodyless = Object.entries(allRunes).filter(
			([, c]) => !declaredSlots(c).has('body') && !Object.values(c.sections ?? {}).includes('body'),
		);
		expect(bodyless.length).toBeGreaterThan(80);
		const names = new Set(bodyless.map(([n]) => n));
		expect(lintSectionRoles(allRunes).filter((f) => f.kind === 'missing-body-role' && names.has(f.rune))).toEqual([]);
	});

	it('every exception carries a reason', () => {
		// An opt-out with an empty string would silence the check while recording
		// nothing, which is the failure mode the exception field exists to avoid.
		for (const [rune, config] of Object.entries(allRunes)) {
			for (const [slot, reason] of Object.entries(config.sectionRoleExceptions ?? {})) {
				expect(typeof reason, `${rune}.${slot}`).toBe('string');
				expect(reason.trim().length, `${rune}.${slot} has an empty reason`).toBeGreaterThan(20);
			}
		}
	});

	it('flags a rune that gains a body slot without the role', () => {
		// The check earns its place only if it actually fires.
		const drifted: Record<string, RuneConfig> = {
			Widget: { block: 'widget', layout: { root: ['body'] } },
		};
		const findings = lintSectionRoles(drifted);
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({ rune: 'Widget', slot: 'body', kind: 'missing-body-role' });
		expect(findings[0].message).toContain('reading');
	});

	it('an exception silences exactly its own slot', () => {
		const base: RuneConfig = { block: 'widget', layout: { root: ['body', 'title'] } };
		expect(lintSectionRoles({ Widget: base }).map((f) => f.slot)).toEqual(['body', 'title']);
		expect(
			lintSectionRoles({ Widget: { ...base, sectionRoleExceptions: { body: 'a reason long enough to be real' } } })
				.map((f) => f.slot),
		).toEqual(['title']);
	});

	it('never flags a role that is present', () => {
		// Direction only. DataTable maps `table → body`; that is an overload of
		// what `body` means, not a data error, and Lumina styles the role
		// directly. Flagging it would push someone toward removing it.
		const findings = lintSectionRoles(allRunes);
		expect(findings.every((f) => f.kind.startsWith('missing-'))).toBe(true);
		expect(allRunes.DataTable?.sections).toMatchObject({ table: 'body' });
		expect(findings.some((f) => f.rune === 'DataTable')).toBe(false);
	});
});
