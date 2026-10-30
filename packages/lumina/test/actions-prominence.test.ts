import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// SPEC-160 D7 / WORK-665, SPEC-183 D5 — button size follows the nearest
// enclosing rune's `prominence`, so a composed `hero` (prominence marquee) gets
// hero-sized buttons and a composed `cta` (display) default ones, with no
// `hero.css` / `cta.css`.
//
// The mechanism is two declarations: the skin sets the size custom properties
// on a `marquee` rune, and the skeleton clears them at every other
// rune root, so they never reach an `actions` inside a nested rune (a raised
// card in a marquee hero keeps default buttons). Checked in a browser while
// building it; held here by the shape of the two rules, since the suite has no
// browser.

const read = (...p: string[]) => readFileSync(join(__dirname, '..', '..', ...p), 'utf-8');
const skin = read('lumina', 'styles', 'runes', 'actions.css');
const skeleton = read('skeleton', 'styles', 'runes', 'actions.css');

/** The declaration block of the first rule whose selector is exactly `selector`. */
function block(css: string, selector: string): string | undefined {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1];
}

describe('button size follows prominence (SPEC-160 D7, SPEC-183 D5)', () => {
	it('`marquee` sets today’s hero size, and no other step does (SPEC-183 D5)', () => {
		const rule = block(skin, '[data-prominence="marquee"]');
		expect(skin).not.toMatch(/data-prominence="(display|prominent)"/);
		expect(rule).toBeDefined();
		expect(rule).toMatch(/--action-padding:\s*0\.7rem 1\.75rem;/);
		expect(rule).toMatch(/--action-font-size:\s*var\(--rf-text\);/);
	});

	it('anything else falls back to today’s cta size', () => {
		expect(skin).not.toMatch(/data-prominence="(normal|quiet)"/);
		expect(skin).toMatch(/padding:\s*var\(--action-padding, 0\.625rem 1\.5rem\)/);
		expect(skin).toMatch(/font-size:\s*var\(--action-font-size, var\(--rf-text-sm\)\)/);
	});

	it('reaches only an `actions` whose nearest enclosing rune carries the prominence', () => {
		const rule = block(skeleton, '[data-rune]:not([data-prominence], [data-rune="actions"])');
		expect(rule).toBeDefined();
		expect(rule).toMatch(/--action-padding:\s*initial;/);
		expect(rule).toMatch(/--action-font-size:\s*initial;/);
	});
});
