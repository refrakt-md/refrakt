import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor, SplitLayoutModel, buildLayoutMetas } from '@refrakt-md/runes';
import { schema } from '../types.js';

class RealmSectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.RealmSection, {
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

export const realmSection = createSchema(RealmSectionModel);

export const realm = createContentModelSchema({
	base: SplitLayoutModel,
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
			{ name: 'scene', match: 'paragraph', optional: true },
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
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

		// Layout meta tags
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);
		const { layout: layoutMeta, ratio: ratioMeta, valign: valignMeta, gap: gapMeta, collapse: collapseMeta } = layoutMetas;

		// Extract scene image from the first preamble paragraph (if it contains an image)
		const sceneAstNodes = asNodes(resolved.scene);
		const sceneRendered = new RenderableNodeCursor(
			Markdoc.transform(sceneAstNodes, config) as RenderableTreeNode[],
		);

		// The image is wrapped in a <p> by Markdoc — look inside paragraph children for <img>
		let sceneImgTag: Markdoc.Tag | undefined;
		for (const node of sceneRendered.toArray()) {
			if (Markdoc.Tag.isTag(node) && node.name === 'img') {
				sceneImgTag = node;
				break;
			}
			if (Markdoc.Tag.isTag(node) && node.name === 'p') {
				const img = node.children.find(
					(c: any) => Markdoc.Tag.isTag(c) && c.name === 'img'
				) as Markdoc.Tag | undefined;
				if (img) {
					sceneImgTag = img;
					break;
				}
			}
		}

		let sceneDiv: RenderableNodeCursor<Markdoc.Tag> | undefined;
		let extraDescription: RenderableTreeNode[] = [];

		if (sceneImgTag) {
			sceneDiv = new RenderableNodeCursor([sceneImgTag]).wrap('div') as RenderableNodeCursor<Markdoc.Tag>;
		} else if (sceneRendered.count() > 0) {
			// First paragraph was text, not an image — include as description
			extraDescription = sceneRendered.toArray();
		}

		// Transform description paragraphs
		const descAstNodes = asNodes(resolved.description);
		const descRendered = new RenderableNodeCursor(
			Markdoc.transform(descAstNodes, config) as RenderableTreeNode[],
		);

		const sections = sectionNodes.tag('div').typeof('RealmSection');
		const hasSections = sections.count() > 0;

		// Build content children (everything except scene)
		const contentChildren: any[] = [];
		const allDescNodes = [...extraDescription, ...descRendered.toArray()];
		if (allDescNodes.length > 0) {
			contentChildren.push(...allDescNodes);
		}

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			contentChildren.push(sectionsContainer.next());
		} else {
			const body = sectionNodes.wrap('div');
			if (sectionNodes.count() > 0) {
				contentChildren.push(body.next());
			}
		}

		const mainContent = new RenderableNodeCursor(contentChildren).wrap('div');

		// Build children array
		// Scene before name so the image appears between header and title in stacked layout.
		// In split layouts, CSS grid explicit placement controls the visual order.
		const children: any[] = [];
		if (sceneDiv) children.push(sceneDiv.next());
		children.push(
			nameTag, realmTypeMeta, scaleMeta, tagsMeta, parentMeta,
			...layoutChildren,
		);
		children.push(mainContent.next());

		// SEO schema
		const schemaMap: Record<string, any> = {
			name: nameTag,
			additionalType: realmTypeMeta,
		};
		if (sceneImgTag) {
			schemaMap.image = sceneImgTag;
		}

		return createComponentRenderable(schema.Realm, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				name: nameTag,
				realmType: realmTypeMeta,
				scale: scaleMeta,
				tags: tagsMeta,
				parent: parentMeta,
				layout: layoutMeta,
				ratio: ratioMeta,
				valign: valignMeta,
				gap: gapMeta,
				collapse: collapseMeta,
				...(hasSections ? { section: sections } : {}),
			},
			refs: {
				name: nameTag,
				...(sceneDiv ? { scene: sceneDiv } : {}),
				content: mainContent,
				...(hasSections ? { sections: sections.wrap('div') } : {}),
			},
			schema: schemaMap,
			children,
		});
	},
});
