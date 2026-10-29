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
 * WORK-666 — `cta` as a composition over `section` (SPEC-160 D7), beside the
 * marketing plugin's `cta` and never in place of it (SPEC-147 D1). The
 * definition is `packages/runes/test/fixtures/composed/cta.md`.
 */

const pkg = composedMarketing({ cta: definitionOf('cta') }, ['CallToAction']);
const mine = (src: string) => byRune(renderPage(pkg, src), 'cta')[0];
const theirs = (src: string) => byRune(renderPage(marketing, src), 'call-to-action')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];

const FIXTURE = marketing.runes.cta.fixture!;
const EYEBROW =
	'{% cta %}\nLimited offer\n\n## Ready to start?\n\nJoin thousands of teams.\n\n- [Sign up](/s)\n{% /cta %}';
const COMMAND =
	'{% cta %}\n## Install it\n\n```bash\nnpm create refrakt\n```\n\n- [Docs](/docs)\n{% /cta %}';
const CASES: Array<[string, string]> = [
	['default', FIXTURE],
	['eyebrow', EYEBROW],
	['command line', COMMAND],
];

describe('the composed cta definition (WORK-666)', () => {
	it('places one section, its header and `{% actions %}` around the actions slot', () => {
		const info = compositionFor(merge(pkg).tags.cta)!;
		expect(info.outline.filter((n) => n.rune)).toEqual([
			expect.objectContaining({ rune: 'section' }),
		]);
		const out = mine(FIXTURE);
		const [actions] = byRune(sectionOf(out), 'actions');
		expect(byName(actions, 'list')[0].attributes['data-slot']).toBe('actions');
	});

	it('defaults to full width and flush, the native cta’s defaults', () => {
		const info = compositionFor(merge(pkg).tags.cta)!;
		expect(Object.keys(info.defaults ?? {}).sort()).toEqual(['elevation', 'width']);
		const out = mine(FIXTURE);
		expect(out.attributes['data-width']).toBe('full');
		expect(sectionOf(out).attributes['data-elevation']).toBe('flush');
	});

	it('reads two leading headings as a headline and body, no longer an eyebrow and a headline (ADR-046)', () => {
		const src = '{% cta %}\n## Limited offer\n\n# Ready to start?\n\n- [Sign up](/s)\n{% /cta %}';
		const plugin = theirs(src);
		expect(text(byName(plugin, 'eyebrow')[0])).toBe('Limited offer');
		expect(text(byName(plugin, 'headline')[0])).toBe('Ready to start?');
		const out = mine(src);
		expect(byName(out, 'eyebrow')).toHaveLength(0);
		expect(text(byName(out, 'headline')[0])).toBe('Limited offer');
		expect(text(byName(out, 'body')[0])).toContain('Ready to start?');
	});

	it('keeps neither context modifier: a block-less config has no BEM class to carry them', () => {
		const config = merge(pkg).themeRunes.Cta;
		expect(config.contextModifiers).toBeUndefined();
	});
});

describe('composed cta against the plugin, for every gallery cell (SPEC-147 D2)', () => {
	it.each(CASES)('%s: the same content, in the same roles', (_case, src) => {
		const a = theirs(src);
		const b = mine(src);
		for (const role of ['eyebrow', 'headline', 'blurb']) {
			expect(byName(b, role).map(text), role).toEqual(byName(a, role).map(text));
		}
		expect(byName(b, 'action').map((n: Json) => n.attributes['data-rank'])).toEqual(
			byName(a, 'action').map((n: Json) => n.attributes['data-rank']),
		);
		expect(byName(b, 'command').map(text)).toEqual(byName(a, 'command').map(text));
	});

	it.each(CASES)('%s: the differences, each explained', (_case, src) => {
		const a = theirs(src);
		const b = mine(src);
		// The plugin renders as `call-to-action`, its alias; the composition as
		// `cta`, its name.
		expect(a.attributes['data-rune']).toBe('call-to-action');
		expect(b.attributes['data-rune']).toBe('cta');
		// Block-less root around a section: no `rf-cta*` class anywhere.
		expect(html(b)).not.toMatch(/rf-cta/);
		expect(b.attributes['data-width']).toBe(a.attributes['data-width']);
		// The header is centred by `section`'s `align`, which the plugin did in CSS.
		expect(sectionOf(b).attributes['data-align']).toBe('center');
		// No prominence: buttons take the default size, today's cta size.
		expect(sectionOf(b).attributes['data-prominence']).toBeUndefined();
		// Not anchored to the measure at `width="wide"`: section declares no
		// `contentMeasure`.
		expect(a.attributes['data-content-measure']).toBe('anchored');
		expect(html(b)).not.toContain('data-content-measure');
	});
});
