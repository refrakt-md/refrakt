import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

// Extract plain text from an AST node
function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

// Parse a color entry from "name: #value" or "name: #val1, #val2, ..."
function parseColorEntry(text: string): { name: string; values: string[] } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;

	const name = text.slice(0, colonIndex).trim();
	const valueStr = text.slice(colonIndex + 1).trim();

	const values = valueStr.split(',').map(v => v.trim()).filter(Boolean);
	return { name, values };
}

// WCAG contrast helpers
function hexToRgb(hex: string): [number, number, number] | null {
	const clean = hex.replace('#', '');
	if (clean.length !== 6 && clean.length !== 3) return null;
	const full = clean.length === 3
		? clean.split('').map(c => c + c).join('')
		: clean;
	const num = parseInt(full, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
	const [rs, gs, bs] = [r, g, b].map(c => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex: string, bgHex: string): number {
	const rgb1 = hexToRgb(hex);
	const rgb2 = hexToRgb(bgHex);
	if (!rgb1 || !rgb2) return 0;
	const l1 = relativeLuminance(...rgb1);
	const l2 = relativeLuminance(...rgb2);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

function textColorFor(hex: string): string {
	const rgb = hexToRgb(hex);
	if (!rgb) return '#000';
	const lum = relativeLuminance(...rgb);
	return lum > 0.179 ? '#000' : '#fff';
}

function autoColumns(count: number, columns?: number): number {
	if (columns != null && columns > 0) return columns;
	if (count <= 3) return count;
	if (count <= 6) return 3;
	if (count <= 8) return 4;
	return 5;
}

interface ColorEntry { name: string; values: string[]; group: string; }
interface ColorGroup { title: string; entries: ColorEntry[]; }

class PaletteModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: Boolean, required: false })
	showContrast: boolean = false;

	@attribute({ type: Boolean, required: false })
	showA11y: boolean = false;

	@attribute({ type: Number, required: false })
	columns: number | undefined = undefined;

	transform(): RenderableTreeNodes {
		// Parse headings and list items from the original AST
		const groups: ColorGroup[] = [];
		let currentGroup: ColorGroup = { title: '', entries: [] };
		groups.push(currentGroup);

		for (const child of this.node.children) {
			if (child.type === 'heading') {
				currentGroup = { title: extractText(child), entries: [] };
				groups.push(currentGroup);
			} else if (child.type === 'list') {
				for (const item of child.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseColorEntry(text);
						if (entry) {
							currentGroup.entries.push({
								name: entry.name,
								values: entry.values,
								group: currentGroup.title,
							});
						}
					}
				}
			}
		}

		const activeGroups = groups.filter(g => g.entries.length > 0);

		// Build complete presentational Tag tree
		const titleMeta = new Tag('meta', { content: this.title });
		const showContrastMeta = new Tag('meta', { content: String(this.showContrast) });
		const showA11yMeta = new Tag('meta', { content: String(this.showA11y) });
		const columnsMeta = new Tag('meta', { content: this.columns != null ? String(this.columns) : '' });

		const groupTags: InstanceType<typeof Tag>[] = [];

		for (const group of activeGroups) {
			const groupChildren: (string | InstanceType<typeof Tag>)[] = [];

			if (group.title) {
				groupChildren.push(new Tag('h4', { 'data-name': 'group-title' }, [group.title]));
			}

			// Split into singles (1 value) and scales (multiple values)
			const singles = group.entries.filter(e => e.values.length <= 1);
			const scales = group.entries.filter(e => e.values.length > 1);

			if (singles.length > 0) {
				const cols = autoColumns(singles.length, this.columns);
				const swatchTags = singles.map(entry => {
					const color = entry.values[0] || '';
					const children: (string | InstanceType<typeof Tag>)[] = [
						new Tag('div', { 'data-name': 'swatch-color', style: `background-color: ${color}` }, []),
						new Tag('span', { 'data-name': 'swatch-name' }, [entry.name]),
						new Tag('span', { 'data-name': 'swatch-value' }, [color]),
					];

					if (this.showContrast || this.showA11y) {
						const onWhite = contrastRatio(color, '#FFFFFF');
						const onBlack = contrastRatio(color, '#000000');

						if (this.showContrast) {
							children.push(new Tag('span', { 'data-name': 'swatch-contrast' }, [
								`W: ${onWhite.toFixed(1)} \u00b7 B: ${onBlack.toFixed(1)}`,
							]));
						}

						if (this.showA11y) {
							const aaPass = onWhite >= 4.5;
							const aaaPass = onWhite >= 7;
							children.push(new Tag('span', { 'data-name': 'swatch-a11y' }, [
								new Tag('span', { 'data-name': aaPass ? 'swatch-a11y--pass' : 'swatch-a11y--fail' }, [`AA ${aaPass ? '\u2713' : '\u2717'}`]),
								new Tag('span', { 'data-name': aaaPass ? 'swatch-a11y--pass' : 'swatch-a11y--fail' }, [`AAA ${aaaPass ? '\u2713' : '\u2717'}`]),
							]));
						}
					}

					return new Tag('div', { 'data-name': 'swatch' }, children);
				});

				groupChildren.push(new Tag('div', { 'data-name': 'grid', style: `--rf-palette-cols: ${cols}` }, swatchTags));
			}

			for (const entry of scales) {
				const stops = entry.values.map(value =>
					new Tag('div', { 'data-name': 'scale-stop', style: `background-color: ${value}; color: ${textColorFor(value)}` }, [value])
				);
				groupChildren.push(new Tag('div', { 'data-name': 'scale' }, stops));
				groupChildren.push(new Tag('span', { 'data-name': 'swatch-name' }, [entry.name]));
			}

			groupTags.push(new Tag('div', { 'data-name': 'group' }, groupChildren));
		}

		// Title is rendered as a structural element — include conditionally
		const topChildren: (string | InstanceType<typeof Tag>)[] = [
			titleMeta, showContrastMeta, showA11yMeta, columnsMeta,
		];
		if (this.title) {
			topChildren.push(new Tag('h3', { 'data-name': 'title' }, [this.title]));
		}
		topChildren.push(...groupTags);

		return createComponentRenderable(schema.Palette, {
			tag: 'section',
			properties: {
				title: titleMeta,
				showContrast: showContrastMeta,
				showA11y: showA11yMeta,
				columns: columnsMeta,
			},
			children: topChildren,
		});
	}
}

export const palette = createSchema(PaletteModel);

/** Extract color tokens from a palette AST node (used by design-context). */
export function extractPaletteTokens(node: Node): { name: string; value: string; group?: string }[] {
	const tokens: { name: string; value: string; group?: string }[] = [];
	let currentGroup = '';

	for (const child of node.children) {
		if (child.type === 'heading') {
			currentGroup = extractText(child);
		} else if (child.type === 'list') {
			for (const item of child.children) {
				if (item.type === 'item') {
					const text = extractText(item);
					const entry = parseColorEntry(text);
					if (entry) {
						if (entry.values.length <= 1) {
							tokens.push({ name: entry.name, value: entry.values[0] || '', group: currentGroup || undefined });
						} else {
							for (const v of entry.values) {
								tokens.push({ name: entry.name, value: v, group: currentGroup || undefined });
							}
						}
					}
				}
			}
		}
	}

	return tokens;
}
