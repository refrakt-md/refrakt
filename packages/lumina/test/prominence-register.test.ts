import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PROMINENCE_VALUES } from '@refrakt-md/transform';

// SPEC-183 / WORK-688 — `prominence` is a register: a `marquee` step above
// `display`, and each step sizes the blurb, the header's gaps and a flush band's
// padding as well as the title. Held by the shape of the rules, as the other
// dimension tests are, since the suite has no browser; checked on
// staging.refrakt.md against the plugin `hero` and `cta`.

const read = (...p: string[]) => readFileSync(join(__dirname, '..', 'styles', ...p), 'utf-8');
const surfaces = read('dimensions', 'surfaces.css');
const density = read('dimensions', 'density.css');
const sections = read('dimensions', 'sections.css');
const section = read('runes', 'section.css');

/** Every declaration block whose selector is exactly `selector`, joined. */
function blocks(css: string, selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'gm');
	return [...css.matchAll(re)].map((m) => m[1]).join('\n');
}

const REGISTER = [
	'--rf-prominence-size',
	'--rf-prominence-blurb-size',
	'--rf-prominence-header-scale',
	'--rf-prominence-band-padding',
	'--rf-prominence-title-gradient',
];

describe('the marquee step (D1)', () => {
	it('is the loudest value of the one list', () => {
		expect(PROMINENCE_VALUES.at(-1)).toBe('marquee');
		expect([...PROMINENCE_VALUES]).toEqual(['quiet', 'normal', 'prominent', 'display', 'marquee']);
	});

	it('ramps the title at 13/6 of the resting size, and leaves display at 5/3', () => {
		expect(blocks(surfaces, '[data-prominence="marquee"]')).toMatch(
			/--rf-prominence-size:\s*calc\(var\(--rf-title-size, var\(--rf-text-2xl\)\) \* 13 \/ 6\)/,
		);
		expect(blocks(surfaces, '[data-prominence="display"]')).toMatch(
			/--rf-prominence-size:\s*calc\(var\(--rf-title-size, var\(--rf-text-2xl\)\) \* 5 \/ 3\)/,
		);
	});
});

describe('each step sizes the whole header (D2)', () => {
	it('grows the blurb and the gaps from prominent up: the cta’s blurb at display, the hero’s at marquee', () => {
		const size = (step: string) =>
			/--rf-prominence-blurb-size:\s*var\((--rf-text-\w+)\)/.exec(
				blocks(surfaces, `[data-prominence="${step}"]`),
			)?.[1];
		expect([size('prominent'), size('display'), size('marquee')]).toEqual([
			'--rf-text-lg',
			'--rf-text-lg',
			'--rf-text-xl',
		]);
		for (const step of ['display', 'marquee']) {
			expect(blocks(surfaces, `[data-prominence="${step}"]`), step).toMatch(
				/--rf-prominence-header-scale:\s*2/,
			);
		}
	});

	it('sets nothing at normal or quiet', () => {
		expect(blocks(surfaces, '[data-prominence="normal"]')).toBe('');
		expect(blocks(surfaces, '[data-prominence="quiet"]')).not.toMatch(
			/blurb|header-scale|band-padding|title-gradient/,
		);
	});

	it('is read by the description, the section header and its body gap', () => {
		expect(sections).toMatch(/font-size:\s*var\(--rf-prominence-blurb-size, var\(--rf-text\)\)/);
		expect(section).toMatch(/gap:\s*calc\(0\.5rem \* var\(--rf-prominence-header-scale, 1\)\)/);
		expect(section).toMatch(/gap:\s*calc\(1\.5rem \* var\(--rf-prominence-header-scale, 1\)\)/);
	});

	it('is cleared at every rune root, so a nested rune keeps its own header', () => {
		const root = blocks(density, '[data-density]');
		for (const prop of REGISTER) expect(root, prop).toContain(`${prop}: initial`);
	});
});

describe('a flush band is padded by its step (D3)', () => {
	it('gives display the cta band and marquee the hero band', () => {
		expect(blocks(surfaces, '[data-prominence="display"]')).toMatch(
			/--rf-prominence-band-padding:\s*3\.5rem 3rem/,
		);
		expect(blocks(surfaces, '[data-prominence="marquee"]')).toMatch(
			/--rf-prominence-band-padding:\s*7rem 6\.5rem/,
		);
		// The plugin hero keeps its band padding on a phone; only a cover band,
		// whose overlay would otherwise eat the well, tightens it.
		expect(surfaces).not.toMatch(/@media[^{]*\{\s*\[data-prominence=/);
		expect(surfaces).toMatch(/padding-block:\s*2\.5rem 2rem;\s*padding-inline:\s*1\.25rem/);
		expect(surfaces).toMatch(/padding-block:\s*3\.5rem 3rem;\s*padding-inline:\s*1\.25rem/);
	});

	it('pads the band 2rem inline, as the plugin hero and cta were', () => {
		expect(
			blocks(
				surfaces,
				'[data-elevation="flush"]:is([data-prominence="display"], [data-prominence="marquee"])',
			),
		).toMatch(/padding-inline:\s*2rem/);
	});

	it('is read only by the flush rung', () => {
		expect(blocks(surfaces, '[data-elevation="flush"]')).toMatch(
			/padding-block:\s*var\(--rf-prominence-band-padding, var\(--rune-padding/,
		);
		const reads = surfaces.match(/var\(--rf-prominence-band-padding/g) ?? [];
		expect(reads).toHaveLength(2); // the flush rung, and a cover band's content
	});

	it('moves onto the overlaid content of a cover band', () => {
		expect(surfaces).toMatch(/\[data-media-position="cover"\][^{]*\{\s*padding:\s*0;/);
		expect(surfaces).toMatch(
			/> \[data-name="content"\]\s*\{\s*padding-block:\s*var\(--rf-prominence-band-padding\)/,
		);
	});
});

describe('the display and marquee titles are a gradient (D4)', () => {
	it('is switched on by those two steps alone', () => {
		const loud = blocks(surfaces, ':is([data-prominence="display"], [data-prominence="marquee"])');
		expect(loud).toMatch(/--rf-prominence-title-gradient:\s*;/);
		expect(surfaces.match(/--rf-prominence-title-gradient:/g)).toHaveLength(1);
	});

	it('is built on the title, from its own colours, so a cover band’s light text keeps its gradient light', () => {
		const title = blocks(sections, '[data-section="title"]');
		const on = 'var\\(--rf-prominence-title-gradient\\)';
		expect(title).toMatch(
			new RegExp(
				`background-image:\\s*${on}\\s*linear-gradient\\(135deg, var\\(--rf-color-text\\) 0%, var\\(--rf-color-muted\\) 100%\\)`,
			),
		);
		expect(title).toMatch(new RegExp(`(?<!-)background-clip:\\s*${on} text`));
		expect(title).toMatch(new RegExp(`-webkit-text-fill-color:\\s*${on} transparent`));
	});

	it('is plain under forced colours', () => {
		expect(sections).toMatch(
			/@media \(forced-colors: active\)\s*\{\s*\[data-section="title"\]\s*\{\s*background-image:\s*none;\s*-webkit-text-fill-color:\s*currentColor;/,
		);
	});
});
