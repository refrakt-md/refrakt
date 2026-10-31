import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { byRune, composedMarketing, definitionOf, renderPage } from './composed-marketing.js';

/**
 * SPEC-183 / WORK-689 — the composed `hero` is `section` at `marquee` and the
 * composed `cta` is `section` at `display`. Every value the plugin stylesheets
 * set for the header and the band has to come from that step instead, so going
 * live can delete `hero.css` and `cta.css` (D6).
 *
 * The suite has no browser, so this compares the two stylesheets value by
 * value: the plugin rune's rule against the register its composition lands on.
 * Checked by eye on staging.refrakt.md against refrakt.md.
 */

const ROOT = join(__dirname, '..', '..', '..');
const css = (...p: string[]) => readFileSync(join(ROOT, 'packages', 'lumina', ...p), 'utf-8');
const tokens = css('tokens', 'base.css');
const surfaces = css('styles', 'dimensions', 'surfaces.css');
const actions = css('styles', 'runes', 'actions.css');
const plugin = { hero: css('styles', 'runes', 'hero.css'), cta: css('styles', 'runes', 'cta.css') };

/** Every declaration block whose selector is exactly `selector`, joined. */
function blocks(source: string, selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'gm');
	return [...source.matchAll(re)].map((m) => m[1]).join('\n');
}
const prop = (block: string, name: string) =>
	new RegExp(`${name}:\\s*([^;]+);`)
		.exec(block)?.[1]
		.replace(/\s+/g, ' ')
		.replace(/\( /g, '(')
		.replace(/ \)/g, ')')
		.trim();
/** A rem length, resolving one `var(--rf-text-*)` token. */
const rem = (value: string | undefined): number => {
	const token = /^var\((--rf-text[\w-]*)\)$/.exec(value ?? '')?.[1];
	const v = token ? prop(tokens, token) : value;
	return Number.parseFloat(v ?? 'NaN');
};

const step = (name: string) => blocks(surfaces, `[data-prominence="${name}"]`);
const loud = blocks(surfaces, ':is([data-prominence="display"], [data-prominence="marquee"])');
/** The ramp's multiplier for a step, as written: `* 13 / 6`. */
const ramp = (name: string) => {
	const [, n, d] = /\* (\d+) \/ (\d+)/.exec(prop(step(name), '--rf-prominence-size') ?? '') ?? [];
	return Number(n) / Number(d);
};

const CASES = [
	{ rune: 'hero', prominence: 'marquee', root: '.rf-hero', blurb: '.rf-hero .rf-hero__blurb' },
	{ rune: 'cta', prominence: 'display', root: '.rf-cta', blurb: '.rf-cta .rf-cta__blurb' },
] as const;

describe.each(CASES)('$rune at $prominence, against the plugin stylesheet (SPEC-183)', (c) => {
	const own = plugin[c.rune];
	const rootRule = blocks(own, c.root);

	it(`is a section at ${c.prominence}`, () => {
		const pkg = composedMarketing({ [c.rune]: definitionOf(c.rune) }, [
			c.rune === 'hero' ? 'Hero' : 'Cta',
		]);
		const src = `{% ${c.rune} %}\n# Headline\n\nBlurb.\n{% /${c.rune} %}`;
		const [section] = byRune(byRune(renderPage(pkg, src), c.rune)[0], 'section');
		expect(section.attributes['data-prominence']).toBe(c.prominence);
	});

	it('has the plugin’s title size, from the 1.5rem default', () => {
		const resting = rem(prop(rootRule, '--rf-title-size'));
		expect(rem('var(--rf-text-2xl)') * ramp(c.prominence)).toBeCloseTo(resting, 5);
	});

	it('has the plugin’s title size on a phone (WORK-690)', () => {
		const phone = (source: string) =>
			/@container \(max-width: 640px\)\s*\{([\s\S]*?)\n\t\}/.exec(source)?.[1] ?? '';
		const plugin = rem(prop(blocks(phone(own), c.root), '--rf-title-size'));
		const [, n, d] =
			/\* (\d+) \/ (\d+)/.exec(
				prop(
					blocks(phone(surfaces), `[data-prominence="${c.prominence}"]`),
					'--rf-prominence-size',
				) ?? '',
			) ?? [];
		expect(rem('var(--rf-text-2xl)') * (Number(n) / Number(d))).toBeCloseTo(plugin, 5);
	});

	it('has the plugin’s blurb size', () => {
		const pluginBlurb = prop(
			blocks(own, `${c.root} p:not([data-section="eyebrow"]),\n\t${c.blurb}`) ||
				own.slice(own.indexOf(c.blurb)),
			'font-size',
		);
		expect(prop(step(c.prominence), '--rf-prominence-blurb-size')).toBe(pluginBlurb);
	});

	it('has the plugin’s band padding', () => {
		const [top, , bottom] = (prop(rootRule, 'padding') ?? '').split(' ');
		expect(prop(step(c.prominence), '--rf-prominence-band-padding')).toBe(`${top} ${bottom}`);
	});

	it('has the plugin’s headline gradient', () => {
		const gradient = /background:\s*(linear-gradient\([^;]+\));/.exec(own)?.[1];
		expect(gradient).toBeDefined();
		// Switched on by the step, and built on the title from the same stops.
		expect(loud).toMatch(/--rf-prominence-title-gradient:\s*;/);
		const title = blocks(css('styles', 'dimensions', 'sections.css'), '[data-section="title"]');
		expect(prop(title, 'background-image')).toBe(`var(--rf-prominence-title-gradient) ${gradient}`);
	});

	it('has the plugin’s button size', () => {
		const pluginPadding = prop(blocks(own, `.rf-${c.rune}__actions`), '--action-padding');
		const register = prop(
			blocks(actions, `[data-prominence="${c.prominence}"]`),
			'--action-padding',
		);
		// The hero sets its own; the cta takes the actions default, and so does `display`.
		expect(register).toBe(pluginPadding);
	});
});
