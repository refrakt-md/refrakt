import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { compositionFor, extractSeo, parse } from '@refrakt-md/runes';
import { marketing } from '../../../plugins/marketing/src/index.js';
import {
	byName,
	byRune,
	composedMarketing,
	definitionOf,
	html,
	liveDir,
	merge,
	pageContext,
	renderPage,
	text,
	type Json,
} from './composed-marketing.js';

/**
 * WORK-665 — `hero` as a composition over `section` (SPEC-160 D7). It was staged
 * on the `staging` site (SPEC-181) and compared with the plugin's native `hero`
 * cell by cell (SPEC-147 D2); every difference was explained there and reviewed
 * on staging.refrakt.md (WORK-689). WORK-702 took it live: the definition is now
 * `plugins/marketing/runes/hero.md`, and the native rune is gone, so the
 * comparison has nothing left to compare against. What it established is kept
 * below as assertions on the composition alone.
 */

const pkg = composedMarketing({ hero: definitionOf('hero') }, []);
const mine = (src: string) => byRune(renderPage(pkg, src), 'hero')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];

const IMG = '![Harbour](/harbour.jpg)';
const FIXTURE = readFileSync(join(liveDir, '..', 'fixtures', 'hero.md'), 'utf-8')
	.replace(/^---[\s\S]*?---\s*/, '')
	.trim();
const withMedia = (attrs: string) =>
	`{% hero ${attrs} %}\n${IMG}\n\n---\n\nNew in 2.0\n\n# Ship faster\n\nOne file per page.\n\n- [Start](/start)\n- [Docs](/docs)\n{% /hero %}`;

/** The gallery's cells for `hero`, as the comparison ran them. */
const CASES: Array<[string, string]> = [
	['default', FIXTURE],
	['align start', FIXTURE.replace('"center"', '"start"')],
	['align end', FIXTURE.replace('"center"', '"end"')],
	['media bottom', withMedia('')],
	['media top', withMedia('media-position="top"')],
	['media end', withMedia('media-position="end"')],
	['cover', withMedia('media-position="cover"')],
	[
		'cover, placed and sized',
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

	it('defaults to full width, flush and marquee prominence, and hosts its media as bleed', () => {
		expect(info.defaults).toMatchObject({
			width: { value: 'full', placement: 'root' },
			elevation: { value: 'flush', rune: 'section' },
			prominence: { value: 'marquee', rune: 'section' },
		});
		const out = mine(withMedia(''));
		expect(out.attributes['data-width']).toBe('full');
		expect(sectionOf(out).attributes['data-elevation']).toBe('flush');
		expect(sectionOf(out).attributes['data-prominence']).toBe('marquee');
		expect(byName(out, 'media')[0].attributes['data-guest-fit']).toBe('bleed');
	});

	it('lets the author override each default', () => {
		const out = mine(withMedia('width="wide" elevation="raised" prominence="prominent"'));
		expect(out.attributes['data-width']).toBe('wide');
		expect(sectionOf(out).attributes['data-elevation']).toBe('raised');
		expect(sectionOf(out).attributes['data-prominence']).toBe('prominent');
	});

	it('puts a `{% bg %}` and a `{% tint %}` on the section, where the `bg` and `tint` attributes land', () => {
		// Left on the empty root, the backdrop was positioned against the page
		// and filled the viewport's height rather than the band (found on
		// staging.refrakt.md).
		const out = mine(
			'{% hero %}\n{% bg gradient="to-br" from="transparent" to="muted/0.2" /%}\n{% tint mode="dark" /%}\n# Ship faster\n{% /hero %}',
		);
		expect(out.attributes['data-bg']).toBeUndefined();
		expect(byName(out, 'bg')).toHaveLength(1);
		expect(sectionOf(out).attributes['data-bg']).toBe('');
		expect(byName(sectionOf(out), 'bg')).toHaveLength(1);
		expect(sectionOf(out).attributes['data-color-scheme']).toBe('dark');
		expect(out.attributes['data-color-scheme']).toBeUndefined();
	});

	it('reads no heading as an eyebrow (ADR-046)', () => {
		const out = mine('{% hero %}\n## What is new\n\n# Ship faster\n{% /hero %}');
		expect(byName(out, 'eyebrow')).toHaveLength(0);
		expect(text(byName(out, 'headline')[0])).toBe('What is new');
		expect(text(byName(out, 'body')[0])).toContain('Ship faster');
	});

	it('keeps a second leading heading as body rather than dropping it (BUG-047)', () => {
		const src = '{% hero %}\n# Ship faster\n\n## For every team\n\nOne file per page.\n{% /hero %}';
		const out = mine(src);
		expect(text(byName(out, 'headline')[0])).toBe('Ship faster');
		expect(text(byName(out, 'body')[0])).toContain('For every team');
		expect(text(byName(out, 'body')[0])).toContain('One file per page.');
	});
});

describe('the shipping hero, for every gallery cell (WORK-702)', () => {
	it.each(CASES)('%s: a block-less wrapper around a marquee section', (_case, src) => {
		const b = mine(src);
		// No `rf-hero*` class anywhere (SPEC-145 D2): the section's BEM classes
		// replace the hero's, and `data-rune` stays for themes and context modifiers.
		expect(b.name).toBe('div');
		expect(html(b)).not.toMatch(/rf-hero/);
		expect(b.attributes['data-rune']).toBe('hero');
		// Width stays on the root; the paint and the header's prominence are the
		// section's (SPEC-145 D33, SPEC-183).
		expect(b.attributes['data-width']).toBe('full');
		expect(sectionOf(b).attributes['data-prominence']).toBe('marquee');
		expect(html(b)).not.toContain('data-content-measure');
		// Every slot-placed node carries its slot name (SPEC-145 D10c).
		expect(byName(b, 'headline')[0].attributes['data-slot']).toBe('headline');
		expect(text(byName(b, 'headline')[0]).length).toBeGreaterThan(0);
	});

	it('the marketing plugin no longer ships a native hero', () => {
		expect(marketing.runes.hero).toBeUndefined();
		expect(marketing.theme?.runes?.Hero).toBeUndefined();
		expect(marketing.runeDir).toBe('runes');
	});
});

describe('the page metadata a hero supplies (WORK-702)', () => {
	it('takes the OG title and description from the headline and blurb, not the eyebrow', () => {
		const { schemas } = pageContext(pkg);
		const tree = Markdoc.transform(
			parse('{% hero %}\nNew in 2.0\n\n# Ship faster\n\nOne file per page.\n{% /hero %}'),
			{
				...schemas,
				variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
			} as never,
		);
		const { og } = extractSeo(tree, {}, '/p');
		expect(og.title).toBe('Ship faster');
		expect(og.description).toBe('One file per page.');
	});
});
