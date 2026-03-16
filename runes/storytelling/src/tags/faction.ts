import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

class FactionSectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.FactionSection, {
			tag: 'div',
			properties: { name: nameTag },
			refs: { body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

export const factionSection = createSchema(FactionSectionModel);

export const faction = createContentModelSchema({
	attributes: {
		name: { type: String, required: true },
		type: { type: String, required: false },
		alignment: { type: String, required: false },
		size: { type: String, required: false },
		tags: { type: String, required: false },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'faction-section',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', optional: true, greedy: true },
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		// Combine explicit child tags (preamble items) with emitted section tags
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);

		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const factionTypeMeta = new Tag('meta', { content: attrs.type ?? '' });
		const alignmentMeta = new Tag('meta', { content: attrs.alignment ?? '' });
		const sizeMeta = new Tag('meta', { content: attrs.size ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		const sections = sectionNodes.tag('div').typeof('FactionSection');
		const hasSections = sections.count() > 0;

		const children: any[] = [nameTag, factionTypeMeta, alignmentMeta, sizeMeta, tagsMeta];

		const schemaMap = {
			name: nameTag,
		};

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			children.push(sectionsContainer.next());

			return createComponentRenderable(schema.Faction, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					factionType: factionTypeMeta,
					alignment: alignmentMeta,
					size: sizeMeta,
					tags: tagsMeta,
					section: sections,
				},
				refs: { sections: sectionsContainer },
				schema: schemaMap,
				children,
			});
		} else {
			const body = sectionNodes.wrap('div');
			children.push(body.next());

			return createComponentRenderable(schema.Faction, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					factionType: factionTypeMeta,
					alignment: alignmentMeta,
					size: sizeMeta,
					tags: tagsMeta,
				},
				refs: { body },
				schema: schemaMap,
				children,
			});
		}
	},
});
