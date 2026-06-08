import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, RenderableNodeCursor, SplitLayoutModel, buildLayoutMetas } from '@refrakt-md/runes';
import { extractScene, buildStoryContent } from './common.js';

export const factionSection = createContentModelSchema({
	attributes: {
		name: { type: String, required: true },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable({ rune: 'faction-section',
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	},
});

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
		const { mediaPosition: mediaPositionMeta, mediaRatio: mediaRatioMeta, valign: valignMeta, collapse: collapseMeta } = layoutMetas;

		// Extract scene image (shared helper)
		const { sceneDiv, sceneImgTag, extraDescription } = extractScene(resolved.scene, config);

		// SPEC-081: emit flat `data-name` slots — the `layout` config builds the
		// content column (preamble header + metadata + body + sections) and the
		// split sees only scene (media) + content.
		const { bodyDiv, sectionsContainer, sections, hasSections } = buildStoryContent(
			extraDescription, resolved.description, sectionNodes, 'FactionSection', config,
		);

		// Build children array. Scene first so it sits on top in stacked /
		// media-position="top".
		const children: any[] = [];
		if (sceneDiv) children.push(sceneDiv.next());
		children.push(
			factionTypeMeta, alignmentMeta, sizeMeta, tagsMeta,
			...layoutChildren,
		);
		children.push(nameTag);
		if (bodyDiv) children.push(bodyDiv.next());
		if (sectionsContainer) children.push(sectionsContainer.next());

		// SEO schema
		const schemaMap: Record<string, any> = {
			name: nameTag,
		};
		if (sceneImgTag) {
			schemaMap.image = sceneImgTag;
		}

		return createComponentRenderable({ rune: 'faction', schemaOrgType: 'Organization',
			tag: 'article',
			property: 'contentSection',
			properties: {
				factionType: factionTypeMeta,
				alignment: alignmentMeta,
				size: sizeMeta,
				tags: tagsMeta,
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				...(hasSections ? { section: sections } : {}),
			},
			refs: {
				name: nameTag,
				...(sceneDiv ? { scene: sceneDiv } : {}),
				...(bodyDiv ? { body: bodyDiv } : {}),
				...(sectionsContainer ? { sections: sectionsContainer } : {}),
			},
			schema: schemaMap,
			children,
		});
	},
});
