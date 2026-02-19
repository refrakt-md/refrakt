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

// Parse "name: value" format
function parseNameValue(text: string): { name: string; value: string } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;
	return {
		name: text.slice(0, colonIndex).trim(),
		value: text.slice(colonIndex + 1).trim(),
	};
}

// Numeric helpers
function numericPx(val: string): number {
	return parseFloat(val) || 0;
}

function multiplier(val: string, unit: string): string {
	const v = numericPx(val);
	const u = numericPx(unit);
	if (u <= 0) return '';
	const m = v / u;
	return `${m}\u00d7`;
}

function maxScale(values: string[]): number {
	return Math.max(...values.map(numericPx), 1);
}

type SectionType = 'spacing' | 'radius' | 'shadows';

interface SpacingItem { name: string; value: string; }
interface SpacingScaleData { unit: string; values: string[]; }
interface ParsedSections {
	spacing: SpacingScaleData | null;
	radii: SpacingItem[];
	shadows: SpacingItem[];
}

class SpacingModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	transform(): RenderableTreeNodes {
		// Parse headings and list items from the original AST into structured data
		const result: ParsedSections = { spacing: null, radii: [], shadows: [] };
		let currentSection: SectionType | '' = '';
		let unit = '';
		let scaleValues: string[] = [];

		for (const child of this.node.children) {
			if (child.type === 'heading') {
				const heading = extractText(child).toLowerCase();
				if (heading.includes('spacing')) currentSection = 'spacing';
				else if (heading.includes('radius') || heading.includes('radii')) currentSection = 'radius';
				else if (heading.includes('shadow')) currentSection = 'shadows';
				else currentSection = '';
			} else if (child.type === 'list' && currentSection) {
				for (const item of child.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseNameValue(text);
						if (!entry) continue;

						if (currentSection === 'spacing') {
							if (entry.name === 'scale') {
								scaleValues = entry.value.split(',').map(v => v.trim());
							} else if (entry.name === 'unit') {
								unit = entry.value;
							}
						} else if (currentSection === 'radius') {
							result.radii.push({ name: entry.name, value: entry.value });
						} else if (currentSection === 'shadows') {
							result.shadows.push({ name: entry.name, value: entry.value });
						}
					}
				}
			}
		}

		if (unit || scaleValues.length > 0) {
			result.spacing = { unit, values: scaleValues };
		}

		// Build complete presentational Tag tree
		const titleMeta = new Tag('meta', { content: this.title });
		const topChildren: (string | InstanceType<typeof Tag>)[] = [titleMeta];

		if (this.title) {
			topChildren.push(new Tag('h3', { 'data-name': 'title' }, [this.title]));
		}

		// Spacing scale section
		if (result.spacing) {
			const max = maxScale(result.spacing.values);
			const scaleItems = result.spacing.values.map(val => {
				const px = numericPx(val);
				const pct = Math.max((px / max) * 100, 2);
				const labelChildren: (string | InstanceType<typeof Tag>)[] = [
					val.includes('px') ? val : val + 'px',
				];
				if (result.spacing?.unit) {
					labelChildren.push(
						new Tag('span', { 'data-name': 'scale-multiplier' }, [multiplier(val, result.spacing.unit)])
					);
				}
				return new Tag('div', { 'data-name': 'scale-item' }, [
					new Tag('div', { 'data-name': 'scale-bar', style: `width: ${pct}%` }, []),
					new Tag('span', { 'data-name': 'scale-label' }, labelChildren),
				]);
			});

			topChildren.push(new Tag('div', { 'data-name': 'section' }, [
				new Tag('h4', { 'data-name': 'section-title' }, ['Spacing']),
				new Tag('div', { 'data-name': 'scale' }, scaleItems),
			]));
		}

		// Radii section
		if (result.radii.length > 0) {
			const radiusItems = result.radii.map(item =>
				new Tag('div', { 'data-name': 'radius-item' }, [
					new Tag('div', { 'data-name': 'radius-sample', style: `border-radius: ${item.value}` }, []),
					new Tag('span', { 'data-name': 'radius-label' }, [item.name]),
					new Tag('span', { 'data-name': 'radius-value' }, [item.value]),
				])
			);

			topChildren.push(new Tag('div', { 'data-name': 'section' }, [
				new Tag('h4', { 'data-name': 'section-title' }, ['Radius']),
				new Tag('div', { 'data-name': 'radii' }, radiusItems),
			]));
		}

		// Shadows section
		if (result.shadows.length > 0) {
			const shadowItems = result.shadows.map(item =>
				new Tag('div', { 'data-name': 'shadow-item' }, [
					new Tag('div', { 'data-name': 'shadow-sample', style: `box-shadow: ${item.value}` }, []),
					new Tag('span', { 'data-name': 'shadow-label' }, [item.name]),
				])
			);

			topChildren.push(new Tag('div', { 'data-name': 'section' }, [
				new Tag('h4', { 'data-name': 'section-title' }, ['Shadows']),
				new Tag('div', { 'data-name': 'shadows' }, shadowItems),
			]));
		}

		return createComponentRenderable(schema.Spacing, {
			tag: 'section',
			properties: {
				title: titleMeta,
			},
			children: topChildren,
		});
	}
}

export const spacing = createSchema(SpacingModel);

/** Extract spacing tokens from a spacing AST node (used by design-context). */
export function extractSpacingTokens(node: Node): {
	spacing?: { unit?: string; scale?: string[] };
	radii?: { name: string; value: string }[];
	shadows?: { name: string; value: string }[];
} {
	const result: {
		spacing?: { unit?: string; scale?: string[] };
		radii?: { name: string; value: string }[];
		shadows?: { name: string; value: string }[];
	} = {};
	let currentSection: SectionType | '' = '';
	let unit = '';
	let scaleValues: string[] = [];
	const radii: { name: string; value: string }[] = [];
	const shadows: { name: string; value: string }[] = [];

	for (const child of node.children) {
		if (child.type === 'heading') {
			const heading = extractText(child).toLowerCase();
			if (heading.includes('spacing')) currentSection = 'spacing';
			else if (heading.includes('radius') || heading.includes('radii')) currentSection = 'radius';
			else if (heading.includes('shadow')) currentSection = 'shadows';
			else currentSection = '';
		} else if (child.type === 'list' && currentSection) {
			for (const item of child.children) {
				if (item.type === 'item') {
					const text = extractText(item);
					const entry = parseNameValue(text);
					if (!entry) continue;

					if (currentSection === 'spacing') {
						if (entry.name === 'scale') {
							scaleValues = entry.value.split(',').map(v => v.trim());
						} else if (entry.name === 'unit') {
							unit = entry.value;
						}
					} else if (currentSection === 'radius') {
						radii.push({ name: entry.name, value: entry.value });
					} else if (currentSection === 'shadows') {
						shadows.push({ name: entry.name, value: entry.value });
					}
				}
			}
		}
	}

	if (unit || scaleValues.length > 0) {
		result.spacing = { unit: unit || undefined, scale: scaleValues.length > 0 ? scaleValues : undefined };
	}
	if (radii.length > 0) result.radii = radii;
	if (shadows.length > 0) result.shadows = shadows;

	return result;
}
