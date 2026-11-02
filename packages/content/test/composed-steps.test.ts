import { describe, it, expect } from 'vitest';
import { compositionFor } from '@refrakt-md/runes';
import { marketing } from '../../../plugins/marketing/src/index.js';
import {
	all,
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
 * WORK-678 — `steps` as a composition over `section` and a numbered ladder
 * (SPEC-161 D5, SPEC-169 D4), beside the marketing plugin's `steps` and never in
 * place of it (SPEC-147 D1). The definition is `site/staged-runes/steps.md`,
 * staged on the `staging` site (SPEC-181).
 *
 * SPEC-147 D2's gate: every difference from the plugin is explained. Each is
 * asserted below, and the visual ones are recorded in WORK-678's resolution.
 */

const pkg = composedMarketing({ steps: definitionOf('steps') }, ['Steps']);
const mine = (src: string) => byRune(renderPage(pkg, src), 'steps')[0];
const theirs = (src: string) => byRune(renderPage(marketing, src), 'steps')[0];
const ladderOf = (root: Json) => byName(root, 'steps')[0];
const itemsOf = (root: Json) => (ladderOf(root).children as Json[]).filter((c) => c?.name === 'li');
const ordinals = (root: Json) => byName(ladderOf(root), 'ordinal').map(text);
/** An item's words, its ordinal aside: its text leaves, joined by spaces. */
const leaves = (n: Json): string[] =>
	typeof n === 'string'
		? [n]
		: Array.isArray(n)
			? n.flatMap(leaves)
			: n && typeof n === 'object'
				? leaves(n.children ?? [])
				: [];
const words = (li: Json) =>
	leaves(li.children.filter((c: Json) => c?.attributes?.['data-name'] !== 'ordinal'))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();

const FIXTURE = marketing.runes.steps.fixture!;
const LIST = `{% steps %}
1. Install the dependencies

   Run the install command for your package manager.

2. Create your content directory

   Add a \`content/\` folder with your Markdown files.

3. Start the dev server
{% /steps %}`;
const HEADINGS = `{% steps %}
### Clone the repository

Fork and clone the repo to your local machine.

### Install dependencies

Run \`npm install\` to set up all packages.
{% /steps %}`;
const HEADER = `{% steps %}
Getting started

1. Install
2. Build
{% /steps %}`;
const MEDIA = `{% steps %}
### Clone

![A terminal](/clone.png)

---

Fork and clone the repo.

### Install

Run \`npm install\`.
{% /steps %}`;

/** The gallery's cells for `steps`: the plugin fixture and the page's examples. */
const CASES: Array<[string, string]> = [
	['default', FIXTURE],
	['ordered list', LIST],
	['headings', HEADINGS],
	['header', HEADER],
	['media split', MEDIA],
];

describe('the composed steps definition (WORK-678)', () => {
	const info = compositionFor(merge(pkg).tags.steps)!;

	it('declares a numbered sequence and a flush section, and places its steps in a ladder', () => {
		expect(merge(pkg).themeRunes.Steps.sequence).toBe('numbered');
		expect(info.defaults).toMatchObject({ elevation: { value: 'flush', rune: 'section' } });
		const out = mine(LIST);
		expect(byRune(out, 'section')[0].attributes['data-elevation']).toBe('flush');
		const ladder = ladderOf(out);
		expect(ladder.name).toBe('ol');
		expect(ladder.attributes['data-zone-layout']).toBe('ladder');
		expect(ladder.attributes['data-sequence']).toBe('numbered');
	});

	it('numbers its steps with DOM nodes, not a counter (WORK-583)', () => {
		expect(ordinals(mine(LIST))).toEqual(['1', '2', '3']);
		expect(ordinals(mine(HEADINGS))).toEqual(['1', '2']);
	});

	it('takes an ordered list or step headings with one model', () => {
		expect(itemsOf(mine(LIST)).map(words)[0]).toBe(
			'Install the dependencies Run the install command for your package manager.',
		);
		expect(itemsOf(mine(HEADINGS)).map(words)).toEqual([
			'Clone the repository Fork and clone the repo to your local machine.',
			'Install dependencies Run npm install to set up all packages.',
		]);
	});

	it('renders a list-item step with no heading as body (ADR-046)', () => {
		const [first] = itemsOf(mine(LIST));
		const [section] = byRune(first, 'section');
		expect(byName(section, 'headline')).toHaveLength(0);
		expect(byName(section, 'blurb')).toHaveLength(0);
		expect(text(byName(section, 'body')[0])).toContain('Install the dependencies');
	});

	it('splits a step on `---` into media and content, as the plugin step does', () => {
		const [first] = itemsOf(mine(MEDIA));
		const [section] = byRune(first, 'section');
		expect(section.attributes['data-media-position']).toBe('bottom');
		expect(all(byName(section, 'media')[0], (n) => n.name === 'img')).toHaveLength(1);
		expect(text(byName(section, 'body')[0])).toContain('Fork and clone the repo.');
	});
});

describe('composed steps against the plugin, for every gallery cell (SPEC-147 D2)', () => {
	it.each(CASES)('%s: the same steps, numbered the same', (_case, src) => {
		const a = theirs(src);
		const b = mine(src);
		expect(ordinals(b)).toEqual(ordinals(a));
		// Each step's words, in order. The plugin also puts a step heading
		// written before `---` in its media zone; it is the same text.
		const plugin = itemsOf(a).map(words);
		const composed = itemsOf(b).map(words);
		expect(composed.map((w) => w.split(' ').sort())).toEqual(
			plugin.map((w) => w.split(' ').sort()),
		);
	});

	it.each(CASES)('%s: the differences, each explained', (_case, src) => {
		const a = theirs(src);
		const b = mine(src);
		// A block-less root around a section: no `rf-steps*` or `rf-step*` class.
		expect(a.name).toBe('section');
		expect(b.name).toBe('div');
		expect(html(b)).not.toMatch(/rf-steps?[_-]/);
		// Each step is a `section` inside the ladder's `<li>`, not an `<li>` that is
		// itself the step rune.
		for (const li of itemsOf(a)) expect(li.attributes['data-rune']).toBe('step');
		for (const li of itemsOf(b)) {
			expect(li.attributes['data-rune']).toBeUndefined();
			expect(byRune(li, 'section')).toHaveLength(1);
		}
		// A step heading is the item's, an `<h3>` above its section: the template
		// writes it, so the author's level is not kept, and it is never moved into
		// the media zone as the plugin's is when the step splits.
		for (const li of itemsOf(b)) {
			const heading = li.children.find((c: Json) => /^h[1-6]$/.test(c?.name ?? ''));
			if (heading) expect(heading.name).toBe('h3');
			for (const media of byName(li, 'media'))
				expect(all(media, (n) => /^h[1-6]$/.test(n.name ?? ''))).toEqual([]);
		}
	});

	it('reads a lone paragraph before the steps as body, where the plugin made it a blurb (ADR-046)', () => {
		expect(text(byName(theirs(HEADER), 'blurb')[0])).toBe('Getting started');
		const out = mine(HEADER);
		expect(byName(out, 'blurb')).toHaveLength(0);
		expect(text(byName(byRune(out, 'section')[0], 'body')[0])).toContain('Getting started');
	});
});
