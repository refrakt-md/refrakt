import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compositionFor } from '@refrakt-md/runes';
import { marketing } from '../../../plugins/marketing/src/index.js';
import {
	byName,
	byRune,
	composedMarketing,
	definitionOf,
	html,
	liveDir,
	merge,
	renderPage,
	text,
	type Json,
} from './composed-marketing.js';

/**
 * WORK-666 — `cta` as a composition over `section` (SPEC-160 D7). It was staged
 * on the `staging` site (SPEC-181) and compared with the plugin's native `cta`
 * cell by cell (SPEC-147 D2); every difference was explained in WORK-666 and
 * reviewed on staging.refrakt.md (WORK-689). WORK-703 took it live: the
 * definition is `plugins/marketing/runes/cta.md`, and the native rune is gone,
 * so what the comparison established is kept as assertions on the composition.
 */

const pkg = composedMarketing({ cta: definitionOf('cta') }, []);
const mine = (src: string) => byRune(renderPage(pkg, src), 'cta')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];

const FIXTURE = readFileSync(join(liveDir, '..', 'fixtures', 'cta.md'), 'utf-8')
	.replace(/^---[\s\S]*?---\s*/, '')
	.trim();
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

	it('defaults to full width, flush and display prominence (SPEC-183 D1)', () => {
		const info = compositionFor(merge(pkg).tags.cta)!;
		expect(Object.keys(info.defaults ?? {}).sort()).toEqual(['elevation', 'prominence', 'width']);
		const out = mine(FIXTURE);
		expect(out.attributes['data-width']).toBe('full');
		expect(sectionOf(out).attributes['data-elevation']).toBe('flush');
		expect(sectionOf(out).attributes['data-prominence']).toBe('display');
	});

	it('reads two leading headings as a headline and body, no longer an eyebrow and a headline (ADR-046)', () => {
		const src = '{% cta %}\n## Limited offer\n\n# Ready to start?\n\n- [Sign up](/s)\n{% /cta %}';
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

describe('the shipping cta, for every gallery cell (WORK-703)', () => {
	it.each(CASES)('%s: a block-less wrapper around a display section', (_case, src) => {
		const b = mine(src);
		// `cta`, its name: the plugin rendered as `call-to-action`, an alias the
		// composition does not declare.
		expect(b.attributes['data-rune']).toBe('cta');
		expect(html(b)).not.toMatch(/rf-cta/);
		expect(b.attributes['data-width']).toBe('full');
		// Centred by `section`'s `align`, at `display` (SPEC-183).
		expect(sectionOf(b).attributes['data-align']).toBe('center');
		expect(sectionOf(b).attributes['data-prominence']).toBe('display');
		expect(html(b)).not.toContain('data-content-measure');
		expect(byName(b, 'headline').map(text)[0]?.length).toBeGreaterThan(0);
		expect(byName(b, 'action').length + byName(b, 'command').length).toBeGreaterThan(0);
	});

	it('the marketing plugin no longer ships a native cta, or its alias', () => {
		expect(marketing.runes.cta).toBeUndefined();
		expect(marketing.theme?.runes?.CallToAction).toBeUndefined();
		expect(merge(pkg).tags['call-to-action']).toBeUndefined();
	});
});
