import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { themeVocabulary, themeVocabularyDimensions } from '@refrakt-md/runes';
import { vocabularyCoverage } from '@refrakt-md/transform';

/**
 * ADR-043 decision 5 (WORK-672) — Lumina covers the vocabulary.
 *
 * A theme configures no rune, so it cannot promise each rune looks right; it
 * covers every vocabulary value instead, and every rune that speaks the
 * vocabulary renders, including runes written after the theme. For each value
 * the check reports whether Lumina styles it (`theme`), leaves it to skeleton
 * (`base`), or neither does (`none`). The `css-coverage` test does the same for
 * BEM selectors; this one is the vocabulary half.
 *
 * The values come from the registries that define them (`themeVocabulary`), so
 * a new meta type, layout, role, media kind or axis value lands here without
 * editing this file.
 */

// ─── Known gaps ───
// Values nothing styles. Each is a value at its default, which needs no rule,
// or a real gap worth a look. The set may only shrink: a value that gains a
// rule must leave it, and a new value nothing styles must be styled or listed
// here with its reason.
const KNOWN_UNSTYLED = new Set([
	// Defaults: the value in effect when the author sets nothing, so the
	// unattributed rules already describe it.
	'[data-width="content"]',
	'[data-inset="default"]',
	'[data-prominence="normal"]', // SPEC-183 D2: `normal` sets nothing
	'[data-frame-overflow="clip"]',
	'[data-substrate-fill="inherit"]',
	// A frame preset's name: presets carry their own rules as custom properties
	// (SPEC-086), so no rule keys on the name.
	'[data-frame]',
	// The dark-mode tint marker: read by the tint cascade's custom properties,
	// not by a selector.
	'[data-tint-dark]',
	// SPEC-185 — the quotation roles still to land: the featured quotation
	// (WORK-697), its excerpt option and the epigraph (WORK-698). Each leaves
	// this set when its rune emits the role and Lumina styles it.
	'[data-quote="featured"]',
	'[data-quote="excerpt"]',
	'[data-quote="epigraph"]',
	// Real gaps. The cover axis emits `data-scrim` with a direction and
	// `data-scrim-type`, while Lumina's scrim rules key on the bg rune's
	// `data-scrim-dir`, and bg's own `data-scrim` carries a type
	// ("gradient" | "frost"). Two meanings of one attribute.
	'[data-scrim="top"]',
	'[data-scrim="bottom"]',
	'[data-scrim="left"]',
	'[data-scrim="right"]',
	'[data-scrim-type="gradient"]',
]);

function cssUnder(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (['node_modules', 'dist', 'test'].includes(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...cssUnder(path));
		else if (entry.name.endsWith('.css')) out.push(readFileSync(path, 'utf-8'));
	}
	return out;
}

const LUMINA = join(__dirname, '..');
const SKELETON = join(__dirname, '../../skeleton');
const rows = vocabularyCoverage(themeVocabulary(), cssUnder(LUMINA), cssUnder(SKELETON));

describe('Lumina covers the theme vocabulary (ADR-043 decision 5)', () => {
	it('reads the vocabulary from its registries, including values added since', () => {
		const names = themeVocabularyDimensions().map((d) => d.name);
		for (const name of ['meta-type', 'sentiment', 'zone-layout', 'section-role', 'media-kind']) {
			expect(names).toContain(name);
		}
		const selectors = rows.map((r) => r.selector);
		// v0.45.0's ladder, and SPEC-183's marquee.
		expect(selectors).toContain('[data-zone-layout="ladder"]');
		expect(selectors).toContain('[data-prominence="marquee"]');
		// WORK-671's pills are styled by the type.
		for (const pill of ['status', 'category', 'tag']) {
			expect(rows.find((r) => r.selector === `[data-meta-type="${pill}"]`)?.coverage).toBe('theme');
		}
	});

	it('every value is styled, by Lumina or skeleton, or is a known gap', () => {
		const unstyled = rows.filter((r) => r.coverage === 'none').map((r) => r.selector);
		expect(unstyled.filter((s) => !KNOWN_UNSTYLED.has(s))).toEqual([]);
	});

	it('every known gap is still a gap — fix one, delete its entry', () => {
		const unstyled = new Set(rows.filter((r) => r.coverage === 'none').map((r) => r.selector));
		expect([...KNOWN_UNSTYLED].filter((s) => !unstyled.has(s))).toEqual([]);
	});
});
