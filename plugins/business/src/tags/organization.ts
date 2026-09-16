import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	RenderableNodeCursor,
	pageSectionProperties,
	unwrapParagraphImages,
} from '@refrakt-md/runes';

/**
 * The organization categories an author may write, which are also the
 * schema.org types they publish.
 *
 * WORK-568 corrected the sixth: schema.org has `NGO`, and has never had
 * `NonProfit`. The enum validated against itself, so `matches` was satisfied and
 * nothing noticed the value was not in the vocabulary it claimed to speak —
 * every site writing `type="NonProfit"` published a `@type` no consumer
 * resolves. It is SPEC-130's argument in miniature: the mapping was already a
 * curated table, already wrong, and wrong somewhere no tool could look.
 */
const orgType = [
	'Organization',
	'LocalBusiness',
	'Corporation',
	'EducationalOrganization',
	'GovernmentOrganization',
	'NGO',
] as const;

// The properties are the same whichever row is selected — all six are
// `Organization` subtypes, so they share its `name` and `description`.
const orgProperties = { headline: 'name', blurb: 'description' } as const;

// SPEC-130 / WORK-568 — `organization` was already doing what this milestone
// proposes: deriving a schema.org type from a content attribute, written
// imperatively as `typeof: attrs.type`. `by: 'type'` says the same thing where a
// reviewer can read it, and keys the rows off the one list that also feeds
// `matches`, so the accepted values and the published types cannot drift.
export const organizationSchema = {
	by: 'type',
	rows: Object.fromEntries(
		orgType.map((type) => [type, { type, properties: orgProperties }]),
	) as Record<(typeof orgType)[number], { type: string; properties: typeof orgProperties }>,
	fallback: { type: 'Organization', properties: orgProperties },
};

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const organizationSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
	body: 'body',
} as const;

export const organization = createContentModelSchema({
	schema: organizationSchema,
	sections: organizationSections,
	provides: ['prose'],
	attributes: {
		type: {
			type: String,
			required: false,
			matches: orgType.slice(),
			description: 'Schema.org organization category used for structured data.',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', greedy: true },
			{ name: 'body', match: 'list|blockquote|tag', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		// Unwrap Markdoc's `<p>` around a leading logo image so it sits bare in the
		// header (and so `pageSectionProperties`' top-level `img` lookup finds it).
		const header = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
			),
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const typeMeta = new Tag('meta', { content: attrs.type ?? 'Organization' });
		const sectionProps = pageSectionProperties(header);

		const bodyDiv = body.wrap('div');

		return createComponentRenderable({
			rune: 'organization',
			tag: 'article',
			property: 'contentSection',
			properties: {
				type: typeMeta,
			},
			refs: {
				...sectionProps,
				body: bodyDiv,
			},
			children: [typeMeta, header.wrap('header').next(), bodyDiv.next()],
		});
	},
});
