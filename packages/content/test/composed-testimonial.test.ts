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
	liveDir,
	merge,
	pageContext,
	renderPage,
	text,
	type Json,
} from './composed-marketing.js';

/**
 * WORK-668 — `testimonial` as a composition over `section` (SPEC-161 D1). It was
 * staged on the `staging` site (SPEC-181), compared with the plugin's native
 * `testimonial` cell by cell (SPEC-147 D2) and reviewed on staging.refrakt.md;
 * WORK-704 took it live. The definition is `plugins/marketing/runes/testimonial.md`,
 * and what the comparison established is kept as assertions on the composition. Its quote is
 * a featured quotation (SPEC-185 D7): it places `{% pullquote %}`, which reads the
 * `**Name** — Role` paragraph and renders it as the `<figcaption>`; the `author` and `role`
 * attributes give the same figcaption without it, passed on to the pull quote.
 */

const pkg = composedMarketing({ testimonial: definitionOf('testimonial') }, []);
const mine = (src: string) => byRune(renderPage(pkg, src), 'testimonial')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];
const pullquoteOf = (root: Json) => byRune(root, 'pull-quote')[0];
const captionOf = (root: Json) => all(pullquoteOf(root), (n) => n.name === 'figcaption')[0];
const nameOf = (root: Json) => byName(captionOf(root), 'name')[0];
const sourceOf = (root: Json) => byName(captionOf(root), 'source')[0];

/** The same testimonial with its byline written as attributes (SPEC-182 D4). */
const asAttributes = (src: string) =>
	src.replace(
		/\{% (testimonial|review)([^%]*?) %\}([\s\S]*?)\n\n\*\*([^*]+)\*\*\s*[-–—,]\s*([^\n]+)\n/g,
		(_m, tag, attrs, before, name, role) =>
			`{% ${tag}${attrs} author="${name}" role="${role}" %}${before}\n`,
	);

const ROOT = join(__dirname, '..', '..', '..');
const FIXTURE = readFileSync(join(liveDir, '..', 'fixtures', 'testimonial.md'), 'utf-8')
	.replace(/^---[\s\S]*?---\s*/, '')
	.trim();
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
		'variant %s: a flat surface at the default density and the round avatar, `variant` on the root',
		(variant) => {
			const out = mine(
				FIXTURE.replace('{% testimonial %}', `{% testimonial variant="${variant}" %}`),
			);
			expect(out.attributes['data-variant']).toBe(variant);
			expect(sectionOf(out).attributes['data-elevation']).toBe('flat');
			expect(sectionOf(out).attributes['data-density']).toBe('full');
			expect(byName(out, 'media')[0].attributes['data-media']).toBe('portrait');
		},
	);

	it('places a featured quotation, which renders the attribution as its figcaption (SPEC-185 D7)', () => {
		const out = mine(FIXTURE);
		const pq = pullquoteOf(out);
		expect(pq.name).toBe('figure');
		expect(pq.attributes['data-quote']).toBe('featured');
		expect(text(nameOf(out))).toBe('Sarah Chen');
		expect(nameOf(out).name).toBe('cite');
		expect(text(sourceOf(out))).toBe('Head of Developer Experience at Acme Corp');
		// The figcaption is the byline: the testimonial has none of its own.
		expect(byName(out, 'byline')).toHaveLength(0);
	});

	it('reads the attribution from the paragraph, and reports nothing on either form', () => {
		const { schemas } = pageContext(pkg);
		for (const src of [FIXTURE, asAttributes(FIXTURE)]) {
			const errors = Markdoc.validate(parse(src), { ...schemas, variables: {} } as never).map(
				(e) => e.error,
			);
			expect(errors.filter((e) => e.level !== 'info')).toEqual([]);
		}
		expect(asAttributes(FIXTURE)).not.toContain('**Sarah Chen**');
		// The paragraph does not render as prose: it became the figcaption.
		expect(html(mine(FIXTURE))).not.toContain('<strong>Sarah Chen</strong>');
	});

	it('renders one figcaption from either form, the same apart from the placed slot', () => {
		// The paragraph form's figcaption is the placed paragraph, so it keeps its
		// `data-slot`; the attribute form's is the pull quote's own.
		const unslotted = (root: Json) =>
			html(pullquoteOf(root)).replace(' data-slot="attribution"', '');
		for (const [, src] of CASES) {
			const a = mine(asAttributes(src));
			const b = mine(src);
			expect(all(pullquoteOf(a), (n) => n.name === 'figcaption')).toHaveLength(1);
			expect(unslotted(a)).toBe(unslotted(b));
		}
	});

	it('with both forms written, the attribute wins, and the graph names one author', () => {
		const src = FIXTURE.replace('{% testimonial %}', '{% testimonial author="Grace Hopper" %}');
		const out = mine(src);
		expect(text(nameOf(out))).toBe('Grace Hopper');
		const [person] = all(out, (n) => n.attributes?.typeof === 'Person');
		const names = all(person, (n) => n.attributes?.property === 'name');
		expect(names.map((n: Json) => n.attributes.content)).toEqual(['Grace Hopper']);
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
		'testimonial.comma, from %s: the recorded graph, with the comma out of the role (BUG-019)',
		(_f, form) => {
			// The native rune kept the separator in the role (`", CTO at Acme"`).
			// The composition's pattern accepts a comma as a separator (SPEC-182
			// D6), and going live (WORK-704) put that in the baseline.
			const composed = graph('testimonial.comma', form);
			expect(JSON.stringify(recorded('testimonial.comma').jsonLd)).not.toContain('", CTO');
			expect(composed.jsonLd).toEqual(recorded('testimonial.comma').jsonLd);
			expect(composed.rendered.jsonLd).toEqual(recorded('testimonial.comma').rendered.jsonLd);
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

describe('the shipping testimonial, for every gallery cell (WORK-704)', () => {
	it.each(CASES)(
		'%s: the quote, author, role, rating and avatar, in their places',
		(_case, src) => {
			const b = mine(src);
			// Block-less root around a section: no `rf-testimonial*` class.
			expect(html(b)).not.toMatch(/rf-testimonial/);
			// The surface lands on the section it places (SPEC-145 D33, D34), at full
			// density: the native rune's compact density would pad the card at 0.5rem
			// (WORK-691).
			expect(sectionOf(b).attributes['data-elevation']).toBe('flat');
			expect(sectionOf(b).attributes['data-density']).toBe('full');
			// SPEC-185 D7 — the authored blockquote, carrying its slot marker and its
			// schema property, inside a placed `pullquote`, which renders the
			// attribution as its figcaption: the native byline's name and role are
			// the figcaption's `<cite>` and source.
			const [quote] = all(b, (n) => n.attributes?.['data-slot'] === 'quote');
			expect(quote.name).toBe('blockquote');
			expect(quote.attributes.property).toBe('reviewBody');
			expect(pullquoteOf(b).attributes['data-quote']).toBe('featured');
			expect(captionOf(b).attributes['data-slot']).toBe('attribution');
			expect(text(nameOf(b))).toBe('Sarah Chen');
			expect(text(sourceOf(b))).toBe('Head of Developer Experience at Acme Corp');
			// The avatar is a media zone beside the content.
			expect(byName(b, 'media')[0].name).toBe('div');
			expect(b.attributes['data-author']).toBeUndefined();
			// `variant` reaches the root as written; the native rune's always read
			// `card`.
			const written = /variant="(\w+)"/.exec(src)?.[1] ?? 'card';
			expect(b.attributes['data-variant']).toBe(written);
			const rated = /rating=(\d)/.exec(src)?.[1];
			expect(b.attributes['data-rating']).toBe(rated ? Number(rated) : undefined);
			expect(byName(b, 'rating')).toHaveLength(rated ? 1 : 0);
		},
	);

	it('the marketing plugin no longer ships a native testimonial', () => {
		expect(marketing.runes.testimonial).toBeUndefined();
		expect(marketing.theme?.runes?.Testimonial).toBeUndefined();
		expect(merge(pkg).tags.review).toBe(merge(pkg).tags.testimonial);
	});
});
