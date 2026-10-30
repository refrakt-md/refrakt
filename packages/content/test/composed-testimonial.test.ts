import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { tags as coreTags, compositionFor, parse, parseFixture } from '@refrakt-md/runes';
import { marketing, migrateTestimonialAttribution } from '../../../plugins/marketing/src/index.js';
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
 * `packages/runes/test/fixtures/composed/testimonial.md`; its author moves from
 * a `**Name** — Role` paragraph to attributes, and the marketing plugin's
 * `migrate-testimonial` codemod rewrites one into the other.
 */

const pkg = composedMarketing({ testimonial: definitionOf('testimonial') }, ['Testimonial']);
const mine = (src: string) => byRune(renderPage(pkg, src), 'testimonial')[0];
const theirs = (src: string) => byRune(renderPage(marketing, src), 'testimonial')[0];
const sectionOf = (root: Json) => byRune(root, 'section')[0];
const migrate = (src: string) => migrateTestimonialAttribution(src).output;

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
		const host = sectionOf(mine(migrate(FIXTURE)));
		expect(host.attributes['data-media-position']).toBe('start');
		expect(byName(host, 'media')[0].attributes['data-media']).toBe('portrait');
	});

	it.each(VARIANTS)(
		'variant %s: a flat, compact surface and the round avatar, `variant` on the root',
		(variant) => {
			const out = mine(
				migrate(FIXTURE.replace('{% testimonial %}', `{% testimonial variant="${variant}" %}`)),
			);
			expect(out.attributes['data-variant']).toBe(variant);
			expect(sectionOf(out).attributes['data-elevation']).toBe('flat');
			expect(sectionOf(out).attributes['data-density']).toBe('compact');
			expect(byName(out, 'media')[0].attributes['data-media']).toBe('portrait');
		},
	);

	it('renders the byline in the `lead` layout: the name leads, the role beneath, nothing ranked', () => {
		const out = mine(migrate(FIXTURE));
		const [byline] = byName(out, 'byline');
		expect(byline.attributes['data-zone-layout']).toBe('lead');
		const [name, role] = byline.children.filter((c: Json) => c && typeof c === 'object');
		expect(name.name).toBe('cite');
		expect('data-lead' in name.attributes).toBe(true);
		expect(text(name)).toBe('Sarah Chen');
		expect(text(role)).toBe('Head of Developer Experience at Acme Corp');
		expect(html(byline)).not.toContain('data-meta-rank');
	});

	it('reports a page still written the old way as `content-unmatched`, at error severity', () => {
		const { schemas } = pageContext(pkg);
		const errors = Markdoc.validate(parse(FIXTURE), { ...schemas, variables: {} } as never).map(
			(e) => e.error,
		);
		// The attribution paragraph matches nothing, and so does the avatar after
		// it: the sequence ends at the first content it cannot place.
		const unmatched = errors.filter((e) => e.id === 'content-unmatched');
		expect(unmatched.map((e) => e.message)).toEqual([
			expect.stringMatching(
				/^paragraph at line 4 matches no content-model field of \{% testimonial %\}/,
			),
			expect.stringMatching(/^paragraph at line 6 /),
		]);
		expect(unmatched.every((e) => e.level === 'error')).toBe(true);
		// …and the paragraph does not render.
		expect(text(mine(FIXTURE))).not.toContain('Sarah Chen');
	});
});

describe('composed testimonial — JSON-LD against the SEO baseline (SPEC-147 D2)', () => {
	const baseline = JSON.parse(
		readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'baseline.json'), 'utf-8'),
	) as { fixtures: Array<{ fixture: string; jsonLd: Json; rendered: { jsonLd: Json } }> };

	it.each(['testimonial', 'testimonial.comma'])(
		'%s: the recorded Review graph, at both harvest points, after the codemod',
		(name) => {
			const file = `${name}.md`;
			const raw = readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'fixtures', file), 'utf-8');
			const recorded = baseline.fixtures.find((f) => f.fixture === name)!;
			const { identity } = pageContext(pkg);
			const ctx = { tags: { ...coreTags, ...merge(pkg).tags }, identity };
			const composed = harvest({ file, ...parseFixture(migrate(raw), file) }, ctx) as {
				jsonLd: Json;
				rendered: { jsonLd: Json };
			};
			expect(composed.jsonLd).toEqual(recorded.jsonLd);
			expect(composed.rendered.jsonLd).toEqual(recorded.rendered.jsonLd);
		},
	);
});

describe('the attribution codemod (SPEC-161 D1)', () => {
	it('rewrites the paragraph into `author` and `role`, as the plugin reads it', () => {
		const out = migrate(FIXTURE);
		expect(out).toContain(
			'{% testimonial author="Sarah Chen" role="Head of Developer Experience at Acme Corp" %}',
		);
		expect(out).not.toContain('**Sarah Chen**');
		// What the plugin rendered as the byline is what the attributes now say.
		const plugin = theirs(FIXTURE);
		expect(text(byName(plugin, 'author-name')[0])).toBe('Sarah Chen');
		expect(text(byName(plugin, 'author-role')[0])).toBe(
			'Head of Developer Experience at Acme Corp',
		);
	});

	it('escapes quotes, leaves an attributed testimonial alone, and reports one with no attribution', () => {
		const src =
			'{% testimonial %}\n> q\n\n**Bob "B" Smith**\n{% /testimonial %}\n\n{% review author="x" %}\n> q\n{% /review %}\n\n{% testimonial %}\n> q\n{% /testimonial %}\n';
		const { output, count, skipped } = migrateTestimonialAttribution(src);
		expect(count).toBe(1);
		expect(output).toContain('{% testimonial author="Bob \\"B\\" Smith" %}');
		expect(skipped.map((s) => s.reason)).toEqual([
			'already has an `author` attribute',
			'no `**Name** — Role` paragraph',
		]);
	});

	it('has migrated every testimonial in this repository’s content and fixtures', () => {
		// WORK-685 applied the codemod once the plugin accepted `author` / `role`
		// (SPEC-181 D7). A further run finds nothing left to rewrite, and the
		// content renders through the composition with nothing unmatched.
		const files = [
			'site/content/index.md',
			'site/content/runes/marketing/testimonial.md',
			'contracts/seo-baseline/fixtures/testimonial.md',
			'contracts/seo-baseline/fixtures/testimonial.comma.md',
		];
		for (const file of files) {
			const source = readFileSync(join(ROOT, file), 'utf-8');
			const { output, count, skipped } = migrateTestimonialAttribution(source);
			expect(count, file).toBe(0);
			expect(output, file).toBe(source);
			expect(
				skipped.every((s) => s.reason === 'already has an `author` attribute'),
				file,
			).toBe(true);
			const { schemas } = pageContext(pkg);
			const ast = parse(output);
			const unmatched = Markdoc.validate(ast, { ...schemas, variables: {} } as never).filter(
				(e) => e.error.id === 'content-unmatched' && e.error.message.includes('{% testimonial %}'),
			);
			expect(unmatched, file).toEqual([]);
			const tags = all(ast, (n) => n.type === 'tag' && /^(testimonial|review)$/.test(n.tag));
			for (const tag of tags) expect(tag.attributes.author, file).toBeTruthy();
		}
	});
});

describe('composed testimonial against the plugin, for every gallery cell (SPEC-147 D2)', () => {
	it.each(CASES)('%s: the same quote, author, role, rating and avatar', (_case, src) => {
		const a = theirs(src);
		const b = mine(migrate(src));
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
		const b = mine(migrate(src));
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
		// The author is a `<cite>`, and the author and role are attributes, so
		// the root carries them as `data-author` / `data-role`: a meta field
		// resolves against the rune's own values (SPEC-145 D7).
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
