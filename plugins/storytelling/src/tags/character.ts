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
} from '@refrakt-md/runes';
import { taxonomyAttributes, buildStoryContent } from './common.js';

export const characterSectionSections = { body: 'body' } as const;

export const characterSection = createContentModelSchema({
	sections: characterSectionSections,
	provides: ['prose'],
	attributes: {
		name: { type: String, required: true },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'character-section',
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	},
});

const roleType = ['protagonist', 'antagonist', 'supporting', 'minor'] as const;
const statusType = ['alive', 'dead', 'unknown', 'missing'] as const;

export const characterSections = {
	preamble: 'preamble',
	name: 'title',
	portrait: 'media',
	body: 'body',
} as const;
export const characterMediaSlots = { portrait: 'portrait' } as const;

export const characterSchema = {
	type: 'Person',
	properties: { name: 'name', role: 'jobTitle' },
} as const;

export const character = createContentModelSchema({
	registers: {
		entity: {
			idFrom: 'name',
			data: ['role', 'status', 'aliases', 'tags', 'name'],
			aliases: { from: 'aliases', separator: ',' },
		},
	},
	schema: characterSchema,
	sections: characterSections,
	provides: ['prose'],
	mediaSlots: characterMediaSlots,
	base: taxonomyAttributes,
	attributes: {
		name: {
			type: String,
			required: true,
			description: 'Display name shown in the character header.',
		},
		role: {
			type: String,
			required: false,
			matches: roleType.slice(),
			description: 'Narrative importance: protagonist, antagonist, supporting, or minor.',
		},
		status: {
			type: String,
			required: false,
			matches: statusType.slice(),
			description: 'Whether the character is alive, dead, unknown, or missing.',
		},
		aliases: {
			type: String,
			required: false,
			description: 'Comma-separated alternate names or titles for this character.',
		},
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'character-section',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'portrait', match: 'image', optional: true },
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
		const roleMeta = new Tag('meta', { content: attrs.role ?? 'supporting' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'alive' });
		const aliasesMeta = new Tag('meta', { content: attrs.aliases ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		const portraitNodes = renderNodes(resolved.portrait, config);
		const portrait = portraitNodes.tag('img').limit(1);
		const hasPortrait = portrait.count() > 0;
		const portraitDiv = hasPortrait ? portrait.wrap('div') : undefined;

		const { bodyDiv, sectionsContainer, sections, hasSections } = buildStoryContent(
			[],
			resolved.description,
			sectionNodes,
			'CharacterSection',
			config,
		);

		const children: any[] = [];
		if (portraitDiv) children.push(portraitDiv.next());
		children.push(nameTag);
		if (bodyDiv) children.push(bodyDiv.next());
		if (sectionsContainer) children.push(sectionsContainer.next());

		return createComponentRenderable({
			rune: 'character',
			tag: 'article',
			properties: {
				role: roleMeta,
				status: statusMeta,
				aliases: aliasesMeta,
				tags: tagsMeta,
				...(hasSections ? { section: sections } : {}),
			},
			refs: {
				name: nameTag,
				portrait: portraitDiv,
				body: bodyDiv,
				sections: sectionsContainer,
			},
			children,
		});
	},
});
