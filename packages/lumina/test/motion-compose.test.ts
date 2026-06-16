import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const motionCss = readFileSync(resolve(here, '../styles/dimensions/motion.css'), 'utf-8');

// SPEC-105 / WORK-432 — the transform-composition rule. Reveal must animate the
// INDIVIDUAL translate/scale properties, never the `transform` shorthand, so it
// composes with the ~48 Lumina files that already use `transform` (hover-lifts on
// card/cta/feature, frame displacement, drawer/nav) instead of clobbering them.
describe('motion dimension transform composition', () => {
	it('animates the individual translate/scale properties', () => {
		expect(motionCss).toMatch(/\btranslate:/);
		expect(motionCss).toMatch(/\bscale:/);
	});

	it('never sets the `transform` shorthand (would clobber rune hover/frame transforms)', () => {
		// Match a `transform:` declaration, not `will-change: transform` or
		// `transition: transform …` (which name the property without setting it).
		const offending = motionCss
			.split(/[;{}]/)
			.map(s => s.trim())
			.filter(decl => /^transform\s*:/.test(decl));
		expect(offending, `motion.css must not set the transform shorthand: ${offending.join(' | ')}`).toEqual([]);
	});

	it('gates the pre-entrance (hidden) state under the root data-animate flag', () => {
		// The SSR-complete guarantee: nothing is hidden without the JS-set gate.
		expect(motionCss).toMatch(/\[data-animate\][\s\S]*?opacity:\s*0/);
	});

	it('drives the stagger delay off the engine index marker, not a structural child', () => {
		expect(motionCss).toContain('--rf-reveal-stagger');
		// The cascade targets the engine's --rf-reveal-index marker (any depth),
		// never a structural `> *`.
		expect(motionCss).toMatch(
			/\[data-stagger\]\[data-in-view\]\s*\[style\*="--rf-reveal-index"\]\s*\{[^}]*transition-delay/,
		);
	});
});
