import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { taxonomyAttributes, buildStoryContent } from './common.js';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const characterSectionSections = { body: 'body' } as const;

export const characterSection = createContentModelSchema({
	sections: characterSectionSections,
	provides: ['prose'],
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

		return createComponentRenderable({ rune: 'character-section',
			tag: 'div',
			refs: { name: nameTag, body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	},
});

const roleType = ['protagonist', 'antagonist', 'supporting', 'minor'] as const;
const statusType = ['alive', 'dead', 'unknown', 'missing'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
// SPEC-125 Phase 1 — the `body` slot carries the character's prose and went
// unmapped, so `reading` / `dropcap` were silently dropped. The header roles
// were already right: `name` is the title, inside the `preamble` header, so
// `prominence` already worked. Realm and Faction share this shape exactly.
export const characterSections = { preamble: 'preamble', name: 'title', portrait: 'media', body: 'body' } as const;
export const characterMediaSlots = { portrait: 'portrait' } as const;

export const character = createContentModelSchema({
	sections: characterSections,
	provides: ['prose'],
	mediaSlots: characterMediaSlots,
	base: taxonomyAttributes,
	attributes: {
		name: { type: String, required: true, description: 'Display name shown in the character header.' },
		role: { type: String, required: false, matches: roleType.slice(), description: 'Narrative importance: protagonist, antagonist, supporting, or minor.' },
		status: { type: String, required: false, matches: statusType.slice(), description: 'Whether the character is alive, dead, unknown, or missing.' },
		aliases: { type: String, required: false, description: 'Comma-separated alternate names or titles for this character.' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'character-section',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'portrait', match: 'image', optional: true },
			// BUG-003 — this was named `header` and matched `heading|paragraph`,
			// and `transform` never read it, so prose written directly inside
			// `{% character %}` was resolved and then dropped. `description` is what
			// Realm and Faction call the same field, and `heading` never matched
			// here anyway: a heading in the preamble starts a section.
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

		// BUG-003 — the same helper Realm and Faction use. It builds the body from
		// the authored prose (plus any leftover nodes when there are no sections),
		// so lead prose and sections can now coexist; the old bespoke version built
		// the body from the *items* cursor and only when `hasSections` was false,
		// which is why prose vanished either way. Character extracts its portrait
		// from an `image` field directly, so there is no leftover scene text —
		// hence the empty `extraDescription`.
		const { bodyDiv, sectionsContainer, sections, hasSections } = buildStoryContent(
			[], resolved.description, sectionNodes, 'CharacterSection', config,
		);

		// SPEC-081: emit flat `data-name` slots — the `layout` config builds the
		// content column + preamble header. The portrait stays a floated avatar
		// sibling (character chrome) placed at the article root.
		const children: any[] = [];
		if (portraitDiv) children.push(portraitDiv.next());
		children.push(roleMeta, statusMeta, aliasesMeta, tagsMeta);
		children.push(nameTag);
		if (bodyDiv) children.push(bodyDiv.next());
		if (sectionsContainer) children.push(sectionsContainer.next());

		const schemaMap = {
			name: nameTag,
			jobTitle: roleMeta,
		};

		return createComponentRenderable({ rune: 'character', schemaOrgType: 'Person',
			tag: 'article',
			property: 'contentSection',
			properties: {
				role: roleMeta,
				status: statusMeta,
				aliases: aliasesMeta,
				tags: tagsMeta,
				...(hasSections ? { section: sections } : {}),
			},
			refs: {
				name: nameTag,
				...(portraitDiv ? { portrait: portraitDiv } : {}),
				...(bodyDiv ? { body: bodyDiv } : {}),
				...(sectionsContainer ? { sections: sectionsContainer } : {}),
			},
			schema: schemaMap,
			children,
		});
	},
});
