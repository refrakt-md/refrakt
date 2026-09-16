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

const difficultyType = ['easy', 'medium', 'hard'] as const;

const bodyFields = [
	{ name: 'header', match: 'heading|paragraph|image' as const, greedy: true, optional: true },
	{ name: 'body', match: 'list|tag' as const, greedy: true, optional: true },
];

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const howToSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
} as const;

/**
 * SPEC-130 / WORK-570 — retype and wrap, declared.
 *
 * The `<li>`s become `HowToTool`s and `HowToStep`s, and each one's own content
 * becomes the property value through the RDFa wrapper the applier emits. See
 * `accordionItemSchema` for why that wrapper is required rather than
 * convenient — an element carrying both `property` and `typeof` has its object
 * fixed to the typed resource, so its text is unreachable as a literal.
 *
 * `textTag: 'p'` because that is what the rune rendered: a `<div>` inside an
 * `<li>` would change the page's margins, and this item's bar is that the HTML
 * does not move.
 *
 * No `lists:` here — see the note on `accordionSchema`.
 */
export const howToSchema = {
	type: 'HowTo',
	properties: { headline: 'name', blurb: 'description', estimatedTime: 'totalTime' },
	children: {
		tool: { type: 'HowToTool', property: 'tool', text: { tool: 'name' }, textTag: 'p' },
		step: { type: 'HowToStep', property: 'step', text: { step: 'text' }, textTag: 'p' },
	},
} as const;

export const howto = createContentModelSchema({
	schema: howToSchema,
	sections: howToSections,
	attributes: {
		estimatedTime: {
			type: String,
			required: false,
			default: '',
			description: 'Estimated total time to complete all steps (e.g. "30 min")',
		},
		difficulty: {
			type: String,
			required: false,
			matches: difficultyType.slice(),
			description: 'Skill level: easy, medium, or hard',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: bodyFields,
	},
	transform(resolved, attrs, config) {
		// Unwrap Markdoc's `<p>` around a leading image so it sits bare in the
		// header (and so `pageSectionProperties`' top-level `img` lookup finds it).
		const header = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
			),
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const estimatedTimeMeta = new Tag('meta', { content: attrs.estimatedTime });
		const difficultyMeta = new Tag('meta', { content: attrs.difficulty ?? '' });

		// Separate unordered lists (tools/materials) and ordered lists (steps)
		const allNodes = body.toArray();
		const tools: any[] = [];
		const steps: any[] = [];

		for (const node of allNodes) {
			if (Markdoc.Tag.isTag(node)) {
				if (node.name === 'ul') {
					tools.push(...(node.children || []));
				} else if (node.name === 'ol') {
					steps.push(...(node.children || []));
				}
			}
		}

		// WORK-570 — the names only; `howToSchema` retypes these and emits the
		// text wrapper, so the rune no longer sets `typeof` on nodes it did not
		// create or hand-writes an RDFa carrier.
		for (const li of tools) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'tool';
		}
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'step';
		}

		const sectionProps = pageSectionProperties(header);
		const toolsList = new Tag('ul', {}, tools);
		const stepsList = new Tag('ol', {}, steps);

		// SPEC-081: emit flat `data-name` slots — the `layout` config groups them
		// into the content column + preamble header.
		const children: any[] = [
			estimatedTimeMeta,
			difficultyMeta,
			...header.toArray(),
			...(tools.length > 0 ? [toolsList] : []),
			stepsList,
		];

		return createComponentRenderable({
			rune: 'how-to',
			tag: 'article',
			property: 'contentSection',
			properties: {
				estimatedTime: estimatedTimeMeta,
				difficulty: difficultyMeta,
			},
			refs: {
				...sectionProps,
				tools: toolsList,
				steps: stepsList,
			},
			children,
		});
	},
});
