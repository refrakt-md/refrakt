import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createSchema, NodeStream } from '@refrakt-md/runes';
import { schema } from '../types.js';
import { extractPaletteTokens } from './palette.js';
import { extractTypographyTokens } from './typography.js';
import { extractSpacingTokens } from './spacing.js';
import type { DesignTokens } from '@refrakt-md/types';

class DesignContextModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false })
	scope: string = 'default';

	@group({ include: ['tag'] })
	body: NodeStream;

	transform(): RenderableTreeNodes {
		// Extract tokens from child AST nodes before transforming
		const tokens: DesignTokens = {};

		for (const child of this.node.children) {
			if (child.type === 'tag') {
				const tagName = child.tag;
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
		const body = this.body.transform();

		// Meta tags
		const titleMeta = new Tag('meta', { content: this.title });
		const tokensMeta = new Tag('meta', { content: JSON.stringify(tokens) });
		const scopeMeta = new Tag('meta', { content: this.scope });

		const topChildren: (string | InstanceType<typeof Tag>)[] = [
			titleMeta,
			tokensMeta,
		];

		if (this.title) {
			topChildren.push(new Tag('h3', { 'data-name': 'title' }, [this.title]));
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
	}
}

export const designContext = createSchema(DesignContextModel);
