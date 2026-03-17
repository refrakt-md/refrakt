import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { extractPaletteTokens } from './palette.js';
import { extractTypographyTokens } from './typography.js';
import { extractSpacingTokens } from './spacing.js';
import type { DesignTokens } from '@refrakt-md/types';

export const designContext = createContentModelSchema({
	attributes: {
		title: { type: String, required: false, default: '', description: 'Heading displayed above the grouped design token sections.' },
		scope: { type: String, required: false, default: 'default', description: 'Named scope that identifies this token set for cross-page references.' },
	},
	contentModel: {
		type: 'sequence' as const,
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const children = asNodes(resolved.body) as Node[];

		// Extract tokens from child AST nodes before transforming
		const tokens: DesignTokens = {};

		for (const child of children) {
			if (child.type === 'tag') {
				const tagName = (child as any).tag;
				if (tagName === 'palette') {
					tokens.colors = extractPaletteTokens(child);
				} else if (tagName === 'typography') {
					tokens.fonts = extractTypographyTokens(child);
				} else if (tagName === 'spacing') {
					const spacingTokens = extractSpacingTokens(child);
					if (spacingTokens.spacing) tokens.spacing = spacingTokens.spacing;
					if (spacingTokens.radii) tokens.radii = spacingTokens.radii;
					if (spacingTokens.shadows) tokens.shadows = spacingTokens.shadows;
				}
			}
		}

		// Transform child body (palette/typography/spacing render as identity-layer tags)
		// Filter to only tag children for the body
		const tagChildren = children.filter(c => c.type === 'tag');
		const body = new RenderableNodeCursor(
			Markdoc.transform(tagChildren, config) as RenderableTreeNode[],
		);

		// Meta tags
		const titleMeta = new Tag('meta', { content: attrs.title });
		const tokensMeta = new Tag('meta', { content: JSON.stringify(tokens) });
		const scopeMeta = new Tag('meta', { content: attrs.scope });

		const topChildren: (string | InstanceType<typeof Tag>)[] = [
			titleMeta,
			tokensMeta,
		];

		if (attrs.title) {
			topChildren.push(new Tag('h3', { 'data-name': 'title' }, [attrs.title as string]));
		}

		// Wrap transformed child runes in a sections container
		const childTags = body.toArray();
		topChildren.push(new Tag('div', { 'data-name': 'sections' }, childTags));

		return createComponentRenderable(schema.DesignContext, {
			tag: 'section',
			properties: {
				title: titleMeta,
				tokens: tokensMeta,
				scope: scopeMeta,
			},
			children: topChildren,
		});
	},
});
