import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor, SplitLayoutModel, buildLayoutMetas } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { extractScene, buildStoryContent } from './common.js';

class FactionSectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.FactionSection, {
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

export const factionSection = createSchema(FactionSectionModel);

export const faction = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		name: { type: String, required: true, description: 'Display name shown in the faction header.' },
		type: { type: String, required: false, description: 'Classification of the group (e.g. guild, kingdom, cult, order).' },
		alignment: { type: String, required: false, description: 'Moral or political stance of the faction (e.g. lawful, chaotic, neutral).' },
		size: { type: String, required: false, description: 'Approximate scale of the faction (e.g. small, medium, large, massive).' },
		tags: { type: String, required: false, description: 'Comma-separated keywords for filtering and cross-referencing.' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'faction-section',
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

		// Domain meta tags
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const factionTypeMeta = new Tag('meta', { content: attrs.type ?? '' });
		const alignmentMeta = new Tag('meta', { content: attrs.alignment ?? '' });
		const sizeMeta = new Tag('meta', { content: attrs.size ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		// Layout meta tags
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);
		const { layout: layoutMeta, ratio: ratioMeta, valign: valignMeta, gap: gapMeta, collapse: collapseMeta } = layoutMetas;

		// Extract scene image (shared helper)
		const { sceneDiv, sceneImgTag, extraDescription } = extractScene(resolved.scene, config);

		// Build content div with sections (shared helper)
		const { mainContent, sections, hasSections } = buildStoryContent(
			extraDescription, resolved.description, sectionNodes, 'FactionSection', config,
		);

		// Build children array
		// Scene before name so the image appears between header and title in stacked layout.
		// In split layouts, CSS grid explicit placement controls the visual order.
		const children: any[] = [];
		if (sceneDiv) children.push(sceneDiv.next());
		children.push(
			nameTag, factionTypeMeta, alignmentMeta, sizeMeta, tagsMeta,
			...layoutChildren,
		);
		children.push(mainContent.next());

		// SEO schema
		const schemaMap: Record<string, any> = {
			name: nameTag,
		};
		if (sceneImgTag) {
			schemaMap.image = sceneImgTag;
		}

		return createComponentRenderable(schema.Faction, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				name: nameTag,
				factionType: factionTypeMeta,
				alignment: alignmentMeta,
				size: sizeMeta,
				tags: tagsMeta,
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
