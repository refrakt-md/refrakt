import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

class StorySectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.CharacterSection, {
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

const roleType = ['protagonist', 'antagonist', 'supporting', 'minor'] as const;
const statusType = ['alive', 'dead', 'unknown', 'missing'] as const;

export const characterSection = createSchema(StorySectionModel);

export const character = createContentModelSchema({
	attributes: {
		name: { type: String, required: true, description: 'Display name shown in the character header.' },
		role: { type: String, required: false, matches: roleType.slice(), description: 'Narrative importance: protagonist, antagonist, supporting, or minor.' },
		status: { type: String, required: false, matches: statusType.slice(), description: 'Whether the character is alive, dead, unknown, or missing.' },
		aliases: { type: String, required: false, description: 'Comma-separated alternate names or titles for this character.' },
		tags: { type: String, required: false, description: 'Comma-separated keywords for filtering and cross-referencing.' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'character-section',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'portrait', match: 'image', optional: true },
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
		const roleMeta = new Tag('meta', { content: attrs.role ?? 'supporting' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'alive' });
		const aliasesMeta = new Tag('meta', { content: attrs.aliases ?? '' });
		const tagsMeta = new Tag('meta', { content: attrs.tags ?? '' });

		// Extract portrait image from preamble
		const portraitNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.portrait), config) as RenderableTreeNode[],
		);
		const portrait = portraitNodes.tag('img').limit(1);
		const hasPortrait = portrait.count() > 0;
		const portraitDiv = hasPortrait ? portrait.wrap('div') : undefined;

		const sections = sectionNodes.tag('div').typeof('CharacterSection');
		const hasSections = sections.count() > 0;

		// Portrait before name so the image appears between header and title in stacked layout.
		const children: any[] = [];
		if (portraitDiv) children.push(portraitDiv.next());
		children.push(nameTag, roleMeta, statusMeta, aliasesMeta, tagsMeta);

		const schemaMap = {
			name: nameTag,
			jobTitle: roleMeta,
		};

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			children.push(sectionsContainer.next());

			return createComponentRenderable(schema.Character, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					role: roleMeta,
					status: statusMeta,
					aliases: aliasesMeta,
					tags: tagsMeta,
					section: sections,
				},
				refs: {
					name: nameTag,
					...(portraitDiv ? { portrait: portraitDiv } : {}),
					sections: sectionsContainer,
				},
				schema: schemaMap,
				children,
			});
		} else {
			const body = sectionNodes.wrap('div');
			children.push(body.next());

			return createComponentRenderable(schema.Character, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					role: roleMeta,
					status: statusMeta,
					aliases: aliasesMeta,
					tags: tagsMeta,
				},
				refs: {
					name: nameTag,
					...(portraitDiv ? { portrait: portraitDiv } : {}),
					body,
				},
				schema: schemaMap,
				children,
			});
		}
	},
});
