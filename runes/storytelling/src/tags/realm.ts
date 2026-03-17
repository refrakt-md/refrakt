import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

class RealmSectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.RealmSection, {
			tag: 'div',
			properties: { name: nameTag },
			refs: { body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

export const realmSection = createSchema(RealmSectionModel);

export const realm = createContentModelSchema({
	attributes: {
		name: { type: String, required: true, description: 'Display name shown in the realm header.' },
		type: { type: String, required: false, description: 'Kind of location (e.g. city, forest, dungeon, plane, continent).' },
		scale: { type: String, required: false, description: 'Geographic scope of the realm (e.g. room, district, region, world).' },
		tags: { type: String, required: false, description: 'Comma-separated keywords for filtering and cross-referencing.' },
		parent: { type: String, required: false, description: 'Name of the containing realm for hierarchical nesting.' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'realm-section',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'scene', match: 'image', optional: true },
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
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
		const realmTypeMeta = new Tag('meta', { content: attrs.type ?? 'place' });
		const scaleMeta = new Tag('meta', { content: attrs.scale ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const parentMeta = new Tag('meta', { content: attrs.parent ?? '' });

		// Extract scene image from preamble
		const sceneNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.scene), config) as RenderableTreeNode[],
		);
		const scene = sceneNodes.tag('img').limit(1);
		const hasScene = scene.count() > 0;
		const sceneDiv = hasScene ? scene.wrap('div') : undefined;

		const sections = sectionNodes.tag('div').typeof('RealmSection');
		const hasSections = sections.count() > 0;

		const children: any[] = [nameTag, realmTypeMeta, scaleMeta, tagsMeta, parentMeta];
		if (sceneDiv) children.push(sceneDiv.next());

		const schemaMap = {
			name: nameTag,
			additionalType: realmTypeMeta,
		};

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			children.push(sectionsContainer.next());

			return createComponentRenderable(schema.Realm, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					realmType: realmTypeMeta,
					scale: scaleMeta,
					tags: tagsMeta,
					parent: parentMeta,
					section: sections,
				},
				refs: {
					...(sceneDiv ? { scene: sceneDiv } : {}),
					sections: sectionsContainer,
				},
				schema: schemaMap,
				children,
			});
		} else {
			const body = sectionNodes.wrap('div');
			children.push(body.next());

			return createComponentRenderable(schema.Realm, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					realmType: realmTypeMeta,
					scale: scaleMeta,
					tags: tagsMeta,
					parent: parentMeta,
				},
				refs: {
					...(sceneDiv ? { scene: sceneDiv } : {}),
					body,
				},
				schema: schemaMap,
				children,
			});
		}
	},
});
