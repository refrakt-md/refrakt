import Markdoc from '@markdoc/markdoc';
import type { Node, Schema, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;

/** The 6 tint token names */
export const TINT_TOKENS = ['background', 'surface', 'primary', 'secondary', 'accent', 'border'] as const;
export type TintToken = typeof TINT_TOKENS[number];

const TOKEN_PATTERN = /^\s*(\w+)\s*:\s*(.+)\s*$/;

/** Extract plain text from an AST node by walking its children */
function textContent(node: Node): string {
	const parts: string[] = [];
	for (const child of node.walk()) {
		if (child.type === 'text' && child.attributes.content) {
			parts.push(child.attributes.content);
		}
	}
	return parts.join(' ').trim();
}

/** Parse the tint rune body into light/dark token sets */
function parseTintBody(children: Node[]): {
	light: Record<string, string>;
	dark: Record<string, string>;
} {
	const light: Record<string, string> = {};
	const dark: Record<string, string> = {};
	let section: 'light' | 'dark' = 'light';

	for (const child of children) {
		if (child.type === 'heading') {
			const text = textContent(child).toLowerCase();
			if (text === 'dark') section = 'dark';
			else if (text === 'light') section = 'light';
			continue;
		}

		if (child.type === 'list') {
			for (const item of child.children) {
				const text = textContent(item);
				const match = text.match(TOKEN_PATTERN);
				if (match) {
					const token = match[1].toLowerCase();
					const value = match[2].trim();
					if ((TINT_TOKENS as readonly string[]).includes(token)) {
						if (section === 'dark') {
							dark[token] = value;
						} else {
							light[token] = value;
						}
					}
				}
			}
		}
	}

	return { light, dark };
}

/**
 * Tint rune schema.
 *
 * The tint rune produces no visible output — it emits meta tags that the
 * parent rune's identity transform reads to apply colour overrides.
 */
export const tint: Schema = {
	attributes: {
		preset: { type: String, required: false, description: 'Named tint preset from the theme' },
		mode: { type: String, required: false, matches: ['auto', 'dark', 'light'], description: 'Whether the tint adapts to auto, dark, or light mode' },
	},
	transform(node: Node, config): RenderableTreeNodes {
		const preset = node.transformAttributes(config).preset as string | undefined;
		const mode = node.transformAttributes(config).mode as string | undefined;

		const { light, dark } = parseTintBody(node.children);

		// Emit a container tag with tint data as meta children.
		// This gets extracted and injected into the parent by createSchema().
		const metas: RenderableTreeNodes[] = [];

		if (preset) {
			metas.push(new Tag('meta', { 'data-field': 'tint', content: preset }));
		} else if (Object.keys(light).length > 0 || Object.keys(dark).length > 0) {
			metas.push(new Tag('meta', { 'data-field': 'tint', content: 'custom' }));
		}

		if (mode && mode !== 'auto') {
			metas.push(new Tag('meta', { 'data-field': 'tint-mode', content: mode }));
		}

		for (const [token, value] of Object.entries(light)) {
			metas.push(new Tag('meta', { 'data-field': `tint-${token}`, content: value }));
		}

		for (const [token, value] of Object.entries(dark)) {
			metas.push(new Tag('meta', { 'data-field': `tint-dark-${token}`, content: value }));
		}

		// Return a wrapper tag that createSchema() will unwrap
		return new Tag('div', { 'data-tint-source': true }, metas as any[]);
	},
};
