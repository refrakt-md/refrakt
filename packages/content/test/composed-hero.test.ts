import { describe, it, expect } from 'vitest';
import { compositionFor } from '@refrakt-md/runes';
import { marketing } from '../../../plugins/marketing/src/index.js';
import {
	byName,
	byRune,
	composedMarketing,
	definitionOf,
	html,
	merge,
	renderPage,
	text,
	type Json,
} from './composed-marketing.js';

/**
 * WORK-665 — `hero` as a composition over `section` (SPEC-160 D7), beside the
 * marketing plugin's `hero` and never in place of it (SPEC-147 D1). The
 * definition is `packages/runes/test/fixtures/composed/hero.md`.
 *
 * SPEC-147 D2's gate: every difference from the plugin is explained. Each is
 * asserted below, and the visual ones (light and dark, through Lumina) are
 * recorded in WORK-665's resolution.
 */

const pkg = composedMarketing({ hero: definitionOf('hero') }, ['Hero']);
const mine = (src: string) => byRune(renderPage(pkg, src), 'hero')[0];
const theirs = (src: string) => byRune(renderPage(marketing, src), 'hero')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];

const IMG = '![Harbour](/harbour.jpg)';
const FIXTURE = marketing.runes.hero.fixture!;
const withMedia = (attrs: string) =>
	`{% hero ${attrs} %}\n${IMG}\n\n---\n\nNew in 2.0\n\n# Ship faster\n\nOne file per page.\n\n- [Start](/start)\n- [Docs](/docs)\n{% /hero %}`;

/** The gallery's cells for `hero`: the plugin fixture across its own enum, plus
 *  the split and cover. The plugin's `left` / `right` are `section`'s `start` /
 *  `end`. */
const CASES: Array<[string, string, string]> = [
	['default', FIXTURE, FIXTURE],
	['align left', FIXTURE.replace('"center"', '"left"'), FIXTURE.replace('"center"', '"start"')],
	['align right', FIXTURE.replace('"center"', '"right"'), FIXTURE.replace('"center"', '"end"')],
	['media bottom', withMedia(''), withMedia('')],
	['media top', withMedia('media-position="top"'), withMedia('media-position="top"')],
	['media end', withMedia('media-position="end"'), withMedia('media-position="end"')],
	['cover', withMedia('media-position="cover"'), withMedia('media-position="cover"')],
	[
		'cover, placed and sized',
		withMedia('media-position="cover" height="lg" content-place="end start"'),
		withMedia('media-position="cover" height="lg" content-place="end start"'),
	],
];

describe('the composed hero definition (WORK-665)', () => {
	const info = compositionFor(merge(pkg).tags.hero)!;

	it('declares align, the split, content-place, height and aspect, and forwards them to its section', () => {
		const out = mine(
			withMedia(
				'align="end" media-position="start" media-ratio="1/3" valign="center" collapse="md" content-place="end start" height="lg" aspect="16/9"',
			),
		);
		const host = sectionOf(out).attributes;
		expect(host['data-align']).toBe('end');
		expect(host['data-media-position']).toBe('start');
		expect(host['data-media-ratio']).toBe('1/3');
		expect(host['data-collapse']).toBe('md');
		expect(host.style).toContain('--split-valign');
		// The root forwards them: none is a modifier of the empty wrapper.
		expect(out.attributes['data-media-position']).toBeUndefined();
	});

	it('defaults to full width, flush and display prominence, and hosts its media as bleed', () => {
		expect(info.defaults).toMatchObject({
			width: { value: 'full', placement: 'root' },
			elevation: { value: 'flush', rune: 'section' },
			prominence: { value: 'display', rune: 'section' },
		});
		const out = mine(withMedia(''));
		expect(out.attributes['data-width']).toBe('full');
		expect(sectionOf(out).attributes['data-elevation']).toBe('flush');
		expect(sectionOf(out).attributes['data-prominence']).toBe('display');
		expect(byName(out, 'media')[0].attributes['data-guest-fit']).toBe('bleed');
	});

	it('lets the author override each default', () => {
		const out = mine(withMedia('width="wide" elevation="raised" prominence="prominent"'));
		expect(out.attributes['data-width']).toBe('wide');
		expect(sectionOf(out).attributes['data-elevation']).toBe('raised');
		expect(sectionOf(out).attributes['data-prominence']).toBe('prominent');
	});

	it('reads no heading as an eyebrow (ADR-046)', () => {
		const out = mine('{% hero %}\n## What is new\n\n# Ship faster\n{% /hero %}');
		expect(byName(out, 'eyebrow')).toHaveLength(0);
		expect(text(byName(out, 'headline')[0])).toBe('What is new');
		expect(text(byName(out, 'body')[0])).toContain('Ship faster');
	});

	it('keeps a second leading heading as body rather than dropping it (BUG-047)', () => {
		const src = '{% hero %}\n# Ship faster\n\n## For every team\n\nOne file per page.\n{% /hero %}';
		expect(text(theirs(src))).not.toContain('For every team');
		const out = mine(src);
		expect(text(byName(out, 'headline')[0])).toBe('Ship faster');
		expect(text(byName(out, 'body')[0])).toContain('For every team');
		expect(text(byName(out, 'body')[0])).toContain('One file per page.');
	});
});

describe('composed hero against the plugin, for every gallery cell (SPEC-147 D2)', () => {
	it.each(CASES)('%s: the same content, in the same roles', (_case, plugin, composed) => {
		const a = theirs(plugin);
		const b = mine(composed);
		for (const role of ['eyebrow', 'headline', 'blurb']) {
			expect(byName(b, role).map(text), role).toEqual(byName(a, role).map(text));
		}
		expect(byName(b, 'action').map((n: Json) => n.attributes['data-rank'])).toEqual(
			byName(a, 'action').map((n: Json) => n.attributes['data-rank']),
		);
		expect(byName(b, 'media').map((m: Json) => html(m.children))).toEqual(
			byName(a, 'media').map((m: Json) => html(m.children)),
		);
		// The split and cover land on the section, with the plugin's values.
		for (const attr of ['data-media-position', 'data-content-place', 'data-height']) {
			expect(sectionOf(b).attributes[attr], attr).toBe(a.attributes[attr]);
		}
		expect(sectionOf(b).attributes['data-cover-scope']).toBe(a.attributes['data-cover-scope']);
		expect(byName(b, 'media')[0]?.attributes['data-media']).toBe(
			byName(a, 'media')[0]?.attributes['data-media'],
		);
	});

	it.each(CASES)('%s: the differences, each explained', (_case, plugin, composed) => {
		const a = theirs(plugin);
		const b = mine(composed);
		// The root is an empty wrapper, block-less: no `rf-hero*` class anywhere
		// (SPEC-145 D2). The section's BEM classes replace the hero's.
		expect(a.name).toBe('section');
		expect(b.name).toBe('div');
		expect(html(b)).not.toMatch(/rf-hero/);
		expect(b.attributes['data-rune']).toBe('hero');
		// Width stays on the root; the paint and the header's prominence move to
		// the section (SPEC-145 D33). The plugin rests at its own title size and
		// carries no `data-prominence`; the composition states `display`.
		expect(b.attributes['data-width']).toBe(a.attributes['data-width']);
		expect(a.attributes['data-prominence']).toBeUndefined();
		expect(sectionOf(b).attributes['data-prominence']).toBe('display');
		// `section` declares no `contentMeasure`, so the content is not anchored
		// to the text measure at `width="wide"`.
		expect(a.attributes['data-content-measure']).toBe('anchored');
		expect(html(b)).not.toContain('data-content-measure');
		// Every slot-placed node carries its slot name (SPEC-145 D10c).
		expect(byName(b, 'headline')[0].attributes['data-slot']).toBe('headline');
	});
});
