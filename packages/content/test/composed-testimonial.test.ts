import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { tags as coreTags, compositionFor, parse, parseFixture } from '@refrakt-md/runes';
import { marketing } from '../../../plugins/marketing/src/index.js';
// The SEO baseline's own harvest, so the composed rune is measured exactly the
// way `contracts/seo-baseline/baseline.json` was.
import { harvest } from '../../../scripts/generate-seo-baseline.mjs';
import {
	all,
	byName,
	byRune,
	composedMarketing,
	definitionOf,
	html,
	merge,
	pageContext,
	renderPage,
	text,
	type Json,
} from './composed-marketing.js';

/**
 * WORK-668 — `testimonial` as a composition over `section` (SPEC-161 D1),
 * beside the marketing plugin's `testimonial` and never in place of it
 * (SPEC-147 D1). The definition is
 * `site/staged-runes/testimonial.md`, staged on the `staging` site (SPEC-181). Its byline is
 * read from the `**Name** — Role` paragraph, as the plugin's is, and the `author` and `role`
 * attributes give the same byline without it (SPEC-182 D6).
 */

const pkg = composedMarketing({ testimonial: definitionOf('testimonial') }, ['Testimonial']);
const mine = (src: string) => byRune(renderPage(pkg, src), 'testimonial')[0];
const theirs = (src: string) => byRune(renderPage(marketing, src), 'testimonial')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];

/** The same testimonial with its byline written as attributes (SPEC-182 D4). */
const asAttributes = (src: string) =>
	src.replace(
		/\{% (testimonial|review)([^%]*?) %\}([\s\S]*?)\n\n\*\*([^*]+)\*\*\s*[-–—,]\s*([^\n]+)\n/g,
		(_m, tag, attrs, before, name, role) =>
			`{% ${tag}${attrs} author="${name}" role="${role}" %}${before}\n`,
	);

const ROOT = join(__dirname, '..', '..', '..');
const FIXTURE = marketing.runes.testimonial.fixture!;
const VARIANTS = ['card', 'inline', 'quote'];

/** The gallery's cells for `testimonial`: its fixture across its own enum, with
 *  and without a rating. */
const CASES: Array<[string, string]> = [
	['default', FIXTURE],
	['rated', FIXTURE.replace('{% testimonial %}', '{% testimonial rating=4 %}')],
	...VARIANTS.map((v): [string, string] => [
		`variant ${v}`,
		FIXTURE.replace('{% testimonial %}', `{% testimonial variant="${v}" rating=5 %}`),
	]),
];

describe('the composed testimonial definition (WORK-668)', () => {
	const info = compositionFor(merge(pkg).tags.testimonial)!;

	it('places one section, the media split at the start and a portrait, with no `{% if %}`', () => {
		expect(info.outline.filter((n) => n.rune)).toEqual([
			expect.objectContaining({ rune: 'section' }),
		]);
		expect(JSON.stringify(info.outline)).not.toContain('conditional');
		const host = sectionOf(mine(FIXTURE));
		expect(host.attributes['data-media-position']).toBe('start');
		expect(byName(host, 'media')[0].attributes['data-media']).toBe('portrait');
	});

	it.each(VARIANTS)(
		'variant %s: a flat, compact surface and the round avatar, `variant` on the root',
		(variant) => {
			const out = mine(
				FIXTURE.replace('{% testimonial %}', `{% testimonial variant="${variant}" %}`),
			);
			expect(out.attributes['data-variant']).toBe(variant);
			expect(sectionOf(out).attributes['data-elevation']).toBe('flat');
			expect(sectionOf(out).attributes['data-density']).toBe('compact');
			expect(byName(out, 'media')[0].attributes['data-media']).toBe('portrait');
		},
	);

	it('renders the byline in the `lead` layout: the name leads, the role beneath, nothing ranked', () => {
		const out = mine(FIXTURE);
		const [byline] = byName(out, 'byline');
		expect(byline.attributes['data-zone-layout']).toBe('lead');
		const [name, role] = byline.children.filter((c: Json) => c && typeof c === 'object');
		expect(name.name).toBe('cite');
		expect('data-lead' in name.attributes).toBe(true);
		expect(text(name)).toBe('Sarah Chen');
		expect(text(role)).toBe('Head of Developer Experience at Acme Corp');
		expect(html(byline)).not.toContain('data-meta-rank');
	});

	it('reads the byline from the paragraph, and reports nothing on either form', () => {
		const { schemas } = pageContext(pkg);
		for (const src of [FIXTURE, asAttributes(FIXTURE)]) {
			const errors = Markdoc.validate(parse(src), { ...schemas, variables: {} } as never).map(
				(e) => e.error,
			);
			expect(errors.filter((e) => e.level !== 'info')).toEqual([]);
		}
		expect(asAttributes(FIXTURE)).not.toContain('**Sarah Chen**');
		// The paragraph does not render as prose: it became the byline.
		expect(text(byName(mine(FIXTURE), 'byline')[0])).toContain('Sarah Chen');
		expect(html(mine(FIXTURE))).not.toContain('<strong>Sarah Chen</strong>');
	});

	it('renders both forms identically', () => {
		for (const [, src] of CASES) {
			expect(html(mine(asAttributes(src)))).toBe(html(mine(src)));
		}
	});

	it('warns `fill-overridden` when both forms are written, and the attribute wins', () => {
		const src = FIXTURE.replace('{% testimonial %}', '{% testimonial author="Grace Hopper" %}');
		const { schemas } = pageContext(pkg);
		const warnings = Markdoc.validate(parse(src), { ...schemas, variables: {} } as never)
			.map((e) => e.error)
			.filter((e) => e.id === 'fill-overridden');
		expect(warnings.map((w) => w.level)).toEqual(['warning']);
		expect(text(byName(mine(src), 'byline')[0])).toContain('Grace Hopper');
	});
});

describe('composed testimonial — JSON-LD against the SEO baseline (SPEC-147 D2)', () => {
	const baseline = JSON.parse(
		readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'baseline.json'), 'utf-8'),
	) as { fixtures: Array<{ fixture: string; jsonLd: Json; rendered: { jsonLd: Json } }> };

	const graph = (name: string, form: (src: string) => string) => {
		const file = `${name}.md`;
		const raw = readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'fixtures', file), 'utf-8');
		const { identity } = pageContext(pkg);
		const ctx = { tags: { ...coreTags, ...merge(pkg).tags }, identity };
		return harvest({ file, ...parseFixture(form(raw), file) }, ctx) as {
			jsonLd: Json;
			rendered: { jsonLd: Json };
		};
	};
	const recorded = (name: string) => baseline.fixtures.find((f) => f.fixture === name)!;
	const forms: Array<[string, (src: string) => string]> = [
		['the paragraph', (src) => src],
		['the attributes', asAttributes],
	];

	it.each(forms)(
		'testimonial, from %s: the recorded Review graph, at both harvest points',
		(_f, form) => {
			const composed = graph('testimonial', form);
			expect(composed.jsonLd).toEqual(recorded('testimonial').jsonLd);
			expect(composed.rendered.jsonLd).toEqual(recorded('testimonial').rendered.jsonLd);
		},
	);

	it.each(forms)(
		'testimonial.comma, from %s: the recorded graph, but with the comma fixed (BUG-019)',
		(_f, form) => {
			// The plugin keeps the separator in the role (`", CTO at Acme"`). The
			// composition's pattern accepts a comma as a separator, so the role is
			// filled without it (SPEC-182 D6). The one difference from the baseline.
			const fixed = (ld: Json) =>
				JSON.parse(JSON.stringify(ld).replace('", CTO at Acme"', '"CTO at Acme"'));
			const composed = graph('testimonial.comma', form);
			expect(JSON.stringify(recorded('testimonial.comma').jsonLd)).toContain('", CTO at Acme"');
			expect(composed.jsonLd).toEqual(fixed(recorded('testimonial.comma').jsonLd));
			expect(composed.rendered.jsonLd).toEqual(
				fixed(recorded('testimonial.comma').rendered.jsonLd),
			);
		},
	);
});

describe('this repository’s testimonials (SPEC-182 D7)', () => {
	it('are written in the paragraph form, and render through the composition with nothing unmatched', () => {
		const files = [
			'site/content/index.md',
			'site/content/runes/marketing/testimonial.md',
			'contracts/seo-baseline/fixtures/testimonial.md',
			'contracts/seo-baseline/fixtures/testimonial.comma.md',
		];
		for (const file of files) {
			const ast = parse(readFileSync(join(ROOT, file), 'utf-8'));
			const tags = all(ast, (n) => n.type === 'tag' && /^(testimonial|review)$/.test(n.tag));
			expect(tags.length, file).toBeGreaterThan(0);
			for (const tag of tags) expect(tag.attributes.author, file).toBeUndefined();
			const { schemas } = pageContext(pkg);
			const findings = Markdoc.validate(ast, { ...schemas, variables: {} } as never).filter(
				(e) => /testimonial/.test(e.error.message) && e.error.level !== 'info',
			);
			expect(findings, file).toEqual([]);
		}
	});
});

describe('composed testimonial against the plugin, for every gallery cell (SPEC-147 D2)', () => {
	it.each(CASES)('%s: the same quote, author, role, rating and avatar', (_case, src) => {
		const a = theirs(src);
		const b = mine(src);
		expect(html(all(b, (n) => n.name === 'blockquote')[0].children)).toBe(
			html(all(a, (n) => n.name === 'blockquote')[0].children),
		);
		const [name, role] = byName(b, 'byline')[0].children.filter(
			(c: Json) => c && typeof c === 'object',
		);
		expect(text(name)).toBe(text(byName(a, 'author-name')[0]));
		expect(text(role)).toBe(text(byName(a, 'author-role')[0]));
		expect(html(byName(b, 'rating').map((r: Json) => r.children))).toBe(
			html(byName(a, 'rating').map((r: Json) => r.children)),
		);
		expect(b.attributes['data-rating']).toBe(a.attributes['data-rating']);
	});

	it.each(CASES)('%s: the differences, each explained', (_case, src) => {
		const a = theirs(src);
		const b = mine(src);
		// Block-less root around a section: no `rf-testimonial*` class.
		expect(html(b)).not.toMatch(/rf-testimonial/);
		// The plugin's surface and compact density are on its root; the
		// composition's land on the section it places (SPEC-145 D33, D34).
		expect(a.attributes['data-elevation']).toBe('flat');
		expect(sectionOf(b).attributes['data-elevation']).toBe('flat');
		expect(a.attributes['data-density']).toBe('compact');
		expect(sectionOf(b).attributes['data-density']).toBe('compact');
		// The avatar is a media zone beside the content rather than the last
		// child: a `div[data-section="media"]` holding the image.
		expect(byName(b, 'media')[0].name).toBe('div');
		// The author is a `<cite>`, and the author and role are the rune's own
		// values, filled from the paragraph, so the root carries them as
		// `data-author` / `data-role`: a meta field resolves against them
		// (SPEC-145 D7, SPEC-182 D2).
		expect(byName(b, 'byline')[0].children.find((c: Json) => c?.name === 'cite')).toBeDefined();
		expect(b.attributes['data-author']).toBe('Sarah Chen');
		// `variant` reaches the root as written. The plugin's always reads
		// `card`: it emits the variant's meta as a child rather than a property,
		// so the field bag never carries it and the modifier falls to its default.
		const written = /variant="(\w+)"/.exec(src)?.[1] ?? 'card';
		expect(b.attributes['data-variant']).toBe(written);
		expect(a.attributes['data-variant']).toBe('card');
	});
});
