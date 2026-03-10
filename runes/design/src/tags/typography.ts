import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';
import { schema } from '../types.js';

// Extract plain text from an AST node
function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

// Parse "role: Family Name (weight1, weight2)" format
function parseFontEntry(text: string): { role: string; family: string; weights: number[] } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;

	const role = text.slice(0, colonIndex).trim();
	const rest = text.slice(colonIndex + 1).trim();

	const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (parenMatch) {
		const family = parenMatch[1].trim();
		const weights = parenMatch[2].split(',').map(w => parseInt(w.trim(), 10)).filter(w => !isNaN(w));
		return { role, family, weights };
	}

	return { role, family: rest, weights: [400] };
}

// Font rendering constants
const SIZES = [48, 32, 24, 18, 14];
const WEIGHT_NAMES: Record<number, string> = {
	100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular',
	500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};
const CHARSET = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz 0123456789 !@#$%^&*()';
const ROLE_FALLBACKS: Record<string, string> = {
	heading: 'sans-serif',
	body: 'sans-serif',
	mono: 'monospace',
	display: 'sans-serif',
	caption: 'sans-serif',
};

interface Specimen { role: string; family: string; weights: number[]; }

function fontStack(specimen: Specimen): string {
	const fallback = ROLE_FALLBACKS[specimen.role] || 'sans-serif';
	return `'${specimen.family}', ${fallback}`;
}

function buildFontsUrl(specimens: Specimen[]): string {
	if (specimens.length === 0) return '';
	const families = specimens.map(s => {
		const name = s.family.replace(/ /g, '+');
		const weights = s.weights.sort((a, b) => a - b).join(';');
		return `family=${name}:wght@${weights}`;
	});
	return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

export const typography = createContentModelSchema({
	attributes: {
		title: { type: String, required: false, default: '' },
		sample: { type: String, required: false, default: 'The quick brown fox jumps over the lazy dog' },
		showSizes: { type: Boolean, required: false, default: true },
		showWeights: { type: Boolean, required: false, default: true },
		showCharset: { type: Boolean, required: false, default: false },
	},
	contentModel: {
		type: 'custom',
		description: 'Passes raw children through for font specimen parsing',
		processChildren(nodes) { return nodes; },
	},
	transform(resolved, attrs) {
		const children = resolved.children as Node[];

		// Parse list items directly from the original AST
		const specimens: Specimen[] = [];
		for (const child of children) {
			if (child.type === 'list') {
				for (const item of child.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseFontEntry(text);
						if (entry) {
							specimens.push(entry);
						}
					}
				}
			}
		}

		const sample = attrs.sample as string;

		// Meta tags for engine modifier consumption
		const titleMeta = new Tag('meta', { content: attrs.title });
		const showSizesMeta = new Tag('meta', { content: String(attrs.showSizes) });
		const showWeightsMeta = new Tag('meta', { content: String(attrs.showWeights) });
		const showCharsetMeta = new Tag('meta', { content: String(attrs.showCharset) });

		// Build complete presentational Tag tree
		const topChildren: (string | InstanceType<typeof Tag>)[] = [
			titleMeta, showSizesMeta, showWeightsMeta, showCharsetMeta,
		];

		// Google Fonts links (rendered in body — browsers handle this fine per HTML5)
		const fontsUrl = buildFontsUrl(specimens);
		if (fontsUrl) {
			topChildren.push(new Tag('link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }, []));
			topChildren.push(new Tag('link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }, []));
			topChildren.push(new Tag('link', { href: fontsUrl, rel: 'stylesheet' }, []));
		}

		if (attrs.title) {
			topChildren.push(new Tag('h3', { 'data-name': 'title' }, [attrs.title as string]));
		}

		// Specimen cards
		const specimenTags = specimens.map(specimen => {
			const stack = fontStack(specimen);
			const specimenChildren: (string | InstanceType<typeof Tag>)[] = [];

			// Header
			specimenChildren.push(new Tag('div', { 'data-name': 'specimen-header' }, [
				new Tag('span', { 'data-name': 'specimen-role' }, [specimen.role]),
				new Tag('span', { 'data-name': 'specimen-family' }, [specimen.family]),
			]));

			// Size samples
			if (attrs.showSizes) {
				const sizeSamples = SIZES.map(size => {
					const text = size <= 18 ? sample : sample.slice(0, Math.floor(60 / (size / 14)));
					return new Tag('div', {
						'data-name': 'size-sample',
						style: `font-family: ${stack}; font-size: ${size}px; font-weight: ${specimen.weights[0]}`,
					}, [
						text,
						new Tag('span', { 'data-name': 'size-label' }, [`${size}px`]),
					]);
				});
				specimenChildren.push(new Tag('div', { 'data-name': 'sizes' }, sizeSamples));
			}

			// Weight samples
			if (attrs.showWeights && specimen.weights.length > 1) {
				const weightSamples = specimen.weights.map(weight => {
					const label = WEIGHT_NAMES[weight] || String(weight);
					return new Tag('div', {
						'data-name': 'weight-sample',
						style: `font-family: ${stack}; font-weight: ${weight}`,
					}, [
						new Tag('span', { 'data-name': 'weight-label' }, [`${weight} \u2014 ${label}`]),
						new Tag('span', { style: 'font-size: 24px' }, ['Aa Bb Cc']),
					]);
				});
				specimenChildren.push(new Tag('div', { 'data-name': 'weights' }, weightSamples));
			}

			// Charset
			if (attrs.showCharset) {
				specimenChildren.push(new Tag('div', {
					'data-name': 'charset',
					style: `font-family: ${stack}; font-weight: ${specimen.weights[0]}`,
				}, [CHARSET]));
			}

			return new Tag('div', { 'data-name': 'specimen' }, specimenChildren);
		});

		topChildren.push(new Tag('div', { 'data-name': 'specimens' }, specimenTags));

		return createComponentRenderable(schema.Typography, {
			tag: 'section',
			properties: {
				title: titleMeta,
				showSizes: showSizesMeta,
				showWeights: showWeightsMeta,
				showCharset: showCharsetMeta,
			},
			children: topChildren,
		});
	},
});

/** Extract font tokens from a typography AST node (used by design-context). */
export function extractTypographyTokens(node: Node): { role: string; family: string; weights: number[]; category: string }[] {
	const tokens: { role: string; family: string; weights: number[]; category: string }[] = [];

	for (const child of node.children) {
		if (child.type === 'list') {
			for (const item of child.children) {
				if (item.type === 'item') {
					const text = extractText(item);
					const entry = parseFontEntry(text);
					if (entry) {
						const category = ROLE_FALLBACKS[entry.role] || 'sans-serif';
						tokens.push({
							role: entry.role,
							family: entry.family,
							weights: entry.weights,
							category,
						});
					}
				}
			}
		}
	}

	return tokens;
}
