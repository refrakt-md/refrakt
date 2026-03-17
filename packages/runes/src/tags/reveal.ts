import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

const modeType = ['click', 'scroll', 'auto'] as const;

class RevealStepModel extends Model {
	@attribute({ type: String, required: true })
	name: string;

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.RevealStep, {
			tag: 'div',
			properties: {
				name: nameTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, body.next()],
		});
	}
}

export const revealStep = createSchema(RevealStepModel);

export const reveal = createContentModelSchema({
	attributes: {
		mode: { type: String, required: false, matches: modeType.slice() },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'reveal-step',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		// Combine explicit child tags (preamble items) with emitted section tags
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);
		const modeMeta = new Tag('meta', { content: attrs.mode ?? 'click' });

		const steps = sectionNodes.tag('div').typeof('RevealStep');
		const stepsContainer = steps.wrap('div');

		const children = headerNodes.count() > 0
			? [headerNodes.wrap('header').next(), modeMeta, stepsContainer.next()]
			: [modeMeta, stepsContainer.next()];

		return createComponentRenderable(schema.Reveal, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				step: steps,
			},
			refs: { ...pageSectionProperties(headerNodes), steps: stepsContainer },
			children,
		});
	},
});
