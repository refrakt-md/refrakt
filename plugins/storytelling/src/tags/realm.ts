import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	SplitLayoutModel,
	buildLayoutMetas,
} from '@refrakt-md/runes';
import { extractScene, buildStoryContent } from './common.js';

export const realmSectionSections = { body: 'body' } as const;

export const realmSection = createContentModelSchema({
	sections: realmSectionSections,
	provides: ['prose'],
	attributes: {
		name: { type: String, required: true },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'realm-section',
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	},
});

export const realmSections = {
	preamble: 'preamble',
	name: 'title',
	scene: 'media',
	body: 'body',
} as const;
export const realmMediaSlots = { scene: 'cover' } as const;

export const realmSchema = {
	type: 'Place',
	properties: { name: 'name', realmType: 'additionalType', sceneImage: 'image' },
} as const;

export const realm = createContentModelSchema({
	registers: {
		entity: { idFrom: 'name', data: ['realmType', 'scale', 'tags', 'parent', 'name'] },
	},
	schema: realmSchema,
	sections: realmSections,
	provides: ['prose'],
	mediaSlots: realmMediaSlots,
	base: SplitLayoutModel,
	attributes: {
		name: { type: String, required: true, description: 'Display name shown in the realm header.' },
		type: {
			type: String,
			required: false,
			description: 'Kind of location (e.g. city, forest, dungeon, plane, continent).',
		},
		scale: {
			type: String,
			required: false,
			description: 'Geographic scope of the realm (e.g. room, district, region, world).',
		},
		tags: {
			type: String,
			required: false,
			description: 'Comma-separated keywords for filtering and cross-referencing.',
		},
		parent: {
			type: String,
			required: false,
			description: 'Name of the containing realm for hierarchical nesting.',
		},
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
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);

		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const realmTypeMeta = new Tag('meta', { content: attrs.type ?? 'place' });
		const scaleMeta = new Tag('meta', { content: attrs.scale ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });
		const parentMeta = new Tag('meta', { content: attrs.parent ?? '' });

		const { metas: layoutMetas } = buildLayoutMetas(attrs);
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		const { sceneDiv, sceneImgTag, extraDescription } = extractScene(resolved.scene, config);

		const { bodyDiv, sectionsContainer, sections, hasSections } = buildStoryContent(
			extraDescription,
			resolved.description,
			sectionNodes,
			'RealmSection',
			config,
		);

		const children: any[] = [];
		if (sceneDiv) children.push(sceneDiv.next());
		children.push(nameTag);
		if (bodyDiv) children.push(bodyDiv.next());
		if (sectionsContainer) children.push(sectionsContainer.next());

		return createComponentRenderable({
			rune: 'realm',
			tag: 'article',
			properties: {
				realmType: realmTypeMeta,
				scale: scaleMeta,
				tags: tagsMeta,
				parent: parentMeta,
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				...(hasSections ? { section: sections } : {}),
			},
			refs: {
				name: nameTag,
				scene: sceneDiv,
				sceneImage: sceneImgTag,
				body: bodyDiv,
				sections: sectionsContainer,
			},
			children,
		});
	},
});
