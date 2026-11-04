import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	asNodes,
	extractText,
	groupByHeading,
} from '@refrakt-md/runes';

function parseNameValue(text: string): { name: string; value: string } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;
	return {
		name: text.slice(0, colonIndex).trim(),
		value: text.slice(colonIndex + 1).trim(),
	};
}

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

function sectionOf(heading: Node): SectionType | '' {
	const text = extractText(heading).toLowerCase();
	if (text.includes('spacing')) return 'spacing';
	if (text.includes('radius') || text.includes('radii')) return 'radius';
	if (text.includes('shadow')) return 'shadows';
	return '';
}

interface SpacingItem {
	name: string;
	value: string;
}
interface SpacingScaleData {
	unit: string;
	values: string[];
}
interface ParsedSections {
	spacing: SpacingScaleData | null;
	radii: SpacingItem[];
	shadows: SpacingItem[];
}

export const spacingSections = { title: 'title' } as const;

export const spacing = createContentModelSchema({
	sections: spacingSections,
	attributes: {
		title: {
			type: String,
			required: false,
			default: '',
			description: 'Heading displayed above the spacing, radii, and shadow sections.',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs) {
		const children = asNodes(resolved.body) as Node[];

		const result: ParsedSections = { spacing: null, radii: [], shadows: [] };
		let unit = '';
		let scaleValues: string[] = [];

		groupByHeading<SectionType | ''>(children, {
			initial: '',
			heading: sectionOf,
			item(item, section) {
				const entry = section ? parseNameValue(extractText(item)) : null;
				if (!entry) return;
				if (section === 'spacing') {
					if (entry.name === 'scale') scaleValues = entry.value.split(',').map((v) => v.trim());
					else if (entry.name === 'unit') unit = entry.value;
				} else if (section === 'radius') {
					result.radii.push({ name: entry.name, value: entry.value });
				} else {
					result.shadows.push({ name: entry.name, value: entry.value });
				}
			},
		});

		if (unit || scaleValues.length > 0) {
			result.spacing = { unit, values: scaleValues };
		}

		const titleMeta = new Tag('meta', { content: attrs.title });
		const topChildren: (string | InstanceType<typeof Tag>)[] = [titleMeta];

		if (attrs.title) {
			topChildren.push(new Tag('h3', { 'data-name': 'title' }, [attrs.title as string]));
		}

		if (result.spacing) {
			const max = maxScale(result.spacing.values);
			const scaleItems = result.spacing.values.map((val) => {
				const px = numericPx(val);
				const pct = Math.max((px / max) * 100, 2);
				const labelChildren: (string | InstanceType<typeof Tag>)[] = [
					val.includes('px') ? val : val + 'px',
				];
				if (result.spacing?.unit) {
					labelChildren.push(
						new Tag('span', { 'data-name': 'scale-multiplier' }, [
							multiplier(val, result.spacing.unit),
						]),
					);
				}
				return new Tag('div', { 'data-name': 'scale-item' }, [
					new Tag('div', { 'data-name': 'scale-bar', style: `width: ${pct}%` }, []),
					new Tag('span', { 'data-name': 'scale-label' }, labelChildren),
				]);
			});

			topChildren.push(
				new Tag('div', { 'data-name': 'section' }, [
					new Tag('h4', { 'data-name': 'section-title' }, ['Spacing']),
					new Tag('div', { 'data-name': 'scale' }, scaleItems),
				]),
			);
		}

		if (result.radii.length > 0) {
			const radiusItems = result.radii.map(
				(item) =>
					new Tag('div', { 'data-name': 'radius-item' }, [
						new Tag(
							'div',
							{ 'data-name': 'radius-sample', style: `border-radius: ${item.value}` },
							[],
						),
						new Tag('span', { 'data-name': 'radius-label' }, [item.name]),
						new Tag('span', { 'data-name': 'radius-value' }, [item.value]),
					]),
			);

			topChildren.push(
				new Tag('div', { 'data-name': 'section' }, [
					new Tag('h4', { 'data-name': 'section-title' }, ['Radius']),
					new Tag('div', { 'data-name': 'radii' }, radiusItems),
				]),
			);
		}

		if (result.shadows.length > 0) {
			const shadowItems = result.shadows.map(
				(item) =>
					new Tag('div', { 'data-name': 'shadow-item' }, [
						new Tag(
							'div',
							{ 'data-name': 'shadow-sample', style: `box-shadow: ${item.value}` },
							[],
						),
						new Tag('span', { 'data-name': 'shadow-label' }, [item.name]),
					]),
			);

			topChildren.push(
				new Tag('div', { 'data-name': 'section' }, [
					new Tag('h4', { 'data-name': 'section-title' }, ['Shadows']),
					new Tag('div', { 'data-name': 'shadows' }, shadowItems),
				]),
			);
		}

		return createComponentRenderable({
			rune: 'spacing',
			tag: 'section',
			properties: {
				title: titleMeta,
			},
			children: topChildren,
		});
	},
});

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
	let unit = '';
	let scaleValues: string[] = [];
	const radii: { name: string; value: string }[] = [];
	const shadows: { name: string; value: string }[] = [];

	groupByHeading<SectionType | ''>(node.children, {
		initial: '',
		heading: sectionOf,
		item(item, section) {
			const entry = section ? parseNameValue(extractText(item)) : null;
			if (!entry) return;
			if (section === 'spacing') {
				if (entry.name === 'scale') scaleValues = entry.value.split(',').map((v) => v.trim());
				else if (entry.name === 'unit') unit = entry.value;
			} else if (section === 'radius') {
				radii.push({ name: entry.name, value: entry.value });
			} else {
				shadows.push({ name: entry.name, value: entry.value });
			}
		},
	});

	if (unit || scaleValues.length > 0) {
		result.spacing = {
			unit: unit || undefined,
			scale: scaleValues.length > 0 ? scaleValues : undefined,
		};
	}
	if (radii.length > 0) result.radii = radii;
	if (shadows.length > 0) result.shadows = shadows;

	return result;
}
