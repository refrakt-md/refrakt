import type { RuneConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, readMeta, resolveGap, ratioToFr, resolveValign } from '@refrakt-md/transform';

// ─── Comparison postTransform helpers ───

/** Recursively find all nodes with a specific data-rune attribute */
function collectByRune(children: RendererNode[], typeName: string): SerializedTag[] {
	const results: SerializedTag[] = [];
	for (const c of children) {
		if (isTag(c)) {
			if (c.attributes?.['data-rune'] === typeName) {
				results.push(c);
			} else {
				results.push(...collectByRune(c.children, typeName));
			}
		}
	}
	return results;
}

/** Read text content from a property span child */
function readPropText(node: SerializedTag, prop: string): string {
	const kebab = prop.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
	for (const c of node.children) {
		if (isTag(c) && c.attributes?.['data-field'] === kebab) {
			return c.children.filter((ch): ch is string => typeof ch === 'string').join('');
		}
	}
	return '';
}

/** Read meta tag value from within a node (for non-modifier metas not consumed by engine) */
function readLocalMeta(node: SerializedTag, prop: string): string {
	const kebab = prop.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
	for (const c of node.children) {
		if (isTag(c) && c.name === 'meta' && c.attributes?.['data-field'] === kebab) {
			return c.attributes.content ?? '';
		}
	}
	return '';
}

/** Find body ref children from a ComparisonRow, filtered to valid content */
function getRowBody(row: SerializedTag): (SerializedTag | string)[] {
	for (const c of row.children) {
		if (isTag(c) && c.attributes?.['data-name'] === 'body') {
			return c.children.filter((ch): ch is SerializedTag | string =>
				typeof ch === 'string' || isTag(ch)
			);
		}
	}
	return [];
}

interface ComparisonColData {
	name: string;
	highlighted: boolean;
	rows: SerializedTag[];
}

function buildComparisonCards(block: string, columns: ComparisonColData[]): SerializedTag {
	const cards = columns.map(col => {
		const cardCls = col.highlighted
			? 'rf-comparison-card rf-comparison-card--highlighted'
			: 'rf-comparison-card';

		const cardChildren: (SerializedTag | string)[] = [];
		if (col.highlighted) {
			cardChildren.push(makeTag('div', { class: 'rf-comparison-card__badge' }, ['Recommended']));
		}
		cardChildren.push(makeTag('h3', { class: 'rf-comparison-card__name' }, [col.name]));

		const rowItems: SerializedTag[] = [];
		for (const row of col.rows) {
			const rType = row.attributes['data-row-type'] || 'text';
			if (rType === 'empty') continue;

			const label = readPropText(row, 'label');
			const body = getRowBody(row);

			let liCls = 'rf-comparison-card__row';
			if (rType === 'negative') liCls += ' rf-comparison-card__row--negative';
			if (rType === 'callout') liCls += ' rf-comparison-card__row--callout';

			const liChildren: (SerializedTag | string)[] = [];
			if (rType === 'check') {
				liChildren.push(makeTag('span', { class: `${block}__row-icon ${block}__row-icon--check`, 'aria-label': 'Supported' }, ['\u2713']));
				if (label) liChildren.push(makeTag('strong', {}, [label]));
				liChildren.push(...body);
			} else if (rType === 'cross') {
				liChildren.push(makeTag('span', { class: `${block}__row-icon ${block}__row-icon--cross`, 'aria-label': 'Not supported' }, ['\u2717']));
				if (label) liChildren.push(makeTag('strong', {}, [label]));
				liChildren.push(...body);
			} else if (rType === 'negative') {
				if (label) liChildren.push(makeTag('strong', {}, [label]));
				if (body.length) liChildren.push(makeTag('span', { class: `${block}__negative` }, body));
			} else if (rType === 'callout') {
				liChildren.push(makeTag('div', { class: `${block}__callout-badge` }, body));
			} else {
				if (label) liChildren.push(makeTag('strong', {}, [label]));
				liChildren.push(...body);
			}

			rowItems.push(makeTag('li', { class: liCls }, liChildren));
		}

		cardChildren.push(makeTag('ul', { class: 'rf-comparison-card__rows' }, rowItems));
		return makeTag('div', { class: cardCls }, cardChildren);
	});

	return makeTag('div', { class: `${block}__cards` }, cards);
}

function buildComparisonTable(
	block: string,
	columns: ComparisonColData[],
	rowLabels: string[],
	labelsPosition: string,
): SerializedTag {
	// Header row
	const headerCells: SerializedTag[] = [];
	if (labelsPosition !== 'hidden') {
		headerCells.push(makeTag('th', { class: `${block}__label-col` }, []));
	}
	for (const col of columns) {
		const thCls = col.highlighted ? `${block}__col-header--highlighted` : '';
		const thChildren: (SerializedTag | string)[] = [col.name];
		if (col.highlighted) {
			thChildren.push(makeTag('span', { class: `${block}__recommended-badge` }, ['Recommended']));
		}
		headerCells.push(makeTag('th', thCls ? { class: thCls } : {}, thChildren));
	}
	const thead = makeTag('thead', {}, [makeTag('tr', {}, headerCells)]);

	// Body rows
	const bodyRows: SerializedTag[] = [];
	for (let i = 0; i < rowLabels.length; i++) {
		const cells: SerializedTag[] = [];
		if (labelsPosition !== 'hidden') {
			cells.push(makeTag('th', { class: `${block}__row-label`, scope: 'row' }, [rowLabels[i]]));
		}
		for (const col of columns) {
			const row = col.rows[i];
			const rType = row ? (row.attributes['data-row-type'] || 'text') : 'empty';
			const body = row ? getRowBody(row) : [];

			let cellCls = `${block}__cell`;
			if (col.highlighted) cellCls += ` ${block}__cell--highlighted`;
			if (rType === 'empty') cellCls += ` ${block}__cell--empty`;

			const cellChildren: (SerializedTag | string)[] = [];
			if (rType === 'check') {
				cellChildren.push(makeTag('span', { class: `${block}__row-icon ${block}__row-icon--check`, 'aria-label': 'Supported' }, ['\u2713']));
			} else if (rType === 'cross') {
				cellChildren.push(makeTag('span', { class: `${block}__row-icon ${block}__row-icon--cross`, 'aria-label': 'Not supported' }, ['\u2717']));
			} else if (rType === 'negative' && body.length) {
				cellChildren.push(makeTag('span', { class: `${block}__negative` }, body));
			} else if (rType === 'empty') {
				cellChildren.push(makeTag('span', { class: `${block}__cell--empty`, 'aria-label': 'Not applicable' }, ['\u2014']));
			} else if (rType === 'callout' && body.length) {
				cellChildren.push(makeTag('span', { class: `${block}__callout-badge` }, body));
			} else if (body.length) {
				cellChildren.push(...body);
			}

			cells.push(makeTag('td', { class: cellCls }, cellChildren));
		}
		bodyRows.push(makeTag('tr', {}, cells));
	}
	const tbody = makeTag('tbody', {}, bodyRows);

	return makeTag('div', { class: `${block}__table-wrapper` }, [
		makeTag('table', { class: `${block}__table` }, [thead, tbody]),
	]);
}

// ─── RuneConfig entries ───

const pageSectionAutoLabel = {
	header: 'header',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Hero: {
		block: 'hero',
		defaultWidth: 'full',
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			align: { source: 'meta', default: 'center' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
		},
		contextModifiers: { 'feature': 'in-feature' },
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
	},
	CallToAction: { block: 'cta', defaultWidth: 'full', contextModifiers: { 'hero': 'in-hero', 'pricing': 'in-pricing' }, autoLabel: pageSectionAutoLabel },
	Bento: {
		block: 'bento',
		modifiers: {
			columns: { source: 'meta', default: '4' },
			gap: { source: 'meta', default: '1rem' },
			sizing: { source: 'meta', default: 'tiered' },
		},
		styles: {
			columns: '--bento-columns',
			gap: '--bento-gap',
		},
		autoLabel: pageSectionAutoLabel,
	},
	BentoCell: {
		block: 'bento-cell',
		parent: 'Bento',
		modifiers: {
			size: { source: 'meta', default: 'medium' },
			span: { source: 'meta', noBemClass: true },
		},
		styles: {
			span: '--cell-span',
		},
		autoLabel: { name: 'title' },
	},
	Feature: {
		block: 'feature',
		defaultWidth: 'full',
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			align: { source: 'meta', default: 'center' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
		},
		contextModifiers: { 'hero': 'in-hero', 'grid': 'in-grid' },
		autoLabel: pageSectionAutoLabel,
	},
	FeatureDefinition: { block: 'feature-definition', parent: 'Feature' },
	Steps: { block: 'steps', autoLabel: pageSectionAutoLabel },
	Step: {
		block: 'step',
		parent: 'Steps',
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
		},
	},
	Pricing: { block: 'pricing', defaultWidth: 'full', autoLabel: pageSectionAutoLabel },
	Tier: { block: 'tier', parent: 'Pricing' },
	FeaturedTier: { block: 'tier', parent: 'Pricing', staticModifiers: ['featured'] },
	Testimonial: {
		block: 'testimonial',
		modifiers: { variant: { source: 'meta', default: 'card' } },
		postTransform(node) {
			const block = node.attributes.class?.split(' ')[0] || 'rf-testimonial';
			const ratingStr = readMeta(node, 'rating');

			// Filter out consumed meta tags, wrap remaining children in content div
			const contentChildren = node.children.filter(child => {
				if (!isTag(child) || child.name !== 'meta') return true;
				return child.attributes['data-field'] !== 'rating';
			});

			const children: (SerializedTag | string)[] = [];

			// Inject star rating if present
			if (ratingStr) {
				const stars = Math.min(5, Math.max(0, Number(ratingStr)));
				const starSpans: SerializedTag[] = [];
				for (let i = 0; i < 5; i++) {
					const cls = i < stars
						? `${block}__star ${block}__star--filled`
						: `${block}__star`;
					starSpans.push(makeTag('span', { class: cls }, ['\u2605']));
				}
				children.push(makeTag('div', {
					class: `${block}__rating`,
					'aria-label': `${stars} out of 5 stars`,
				}, starSpans));
			}

			children.push(makeTag('div', { class: `${block}__content` }, contentChildren));

			return { ...node, children };
		},
	},
	Comparison: {
		block: 'comparison',
		postTransform(node) {
			const block = 'rf-comparison';
			const layout = readMeta(node, 'layout') || 'table';
			const verdict = readMeta(node, 'verdict') || '';
			const labelsPosition = readMeta(node, 'labels') || 'left';
			const rowLabelsJson = readMeta(node, 'rowLabels') || '[]';
			let rowLabels: string[] = [];
			try { rowLabels = JSON.parse(rowLabelsJson); } catch { /* fallback */ }

			// Find title heading
			const titleTag = node.children.find(c => isTag(c) && /^h[1-6]$/.test(c.name));
			const titleText = titleTag && isTag(titleTag)
				? titleTag.children.filter((c): c is string => typeof c === 'string').join('')
				: '';

			// Find ComparisonColumn children (inside the grid wrapper)
			const columns = collectByRune(node.children, 'comparison-column');

			// Extract structured data from each column
			const columnData: ComparisonColData[] = columns.map(col => ({
				name: readPropText(col, 'name'),
				highlighted: readLocalMeta(col, 'highlighted') === 'true',
				rows: collectByRune(col.children, 'comparison-row'),
			}));

			// Build layout
			const children: (SerializedTag | string)[] = [];
			if (titleText) {
				children.push(makeTag('h2', { class: `${block}__title` }, [titleText]));
			}
			if (layout === 'cards') {
				children.push(buildComparisonCards(block, columnData));
			} else {
				children.push(buildComparisonTable(block, columnData, rowLabels, labelsPosition));
			}
			if (verdict) {
				children.push(makeTag('p', { class: `${block}__verdict` }, [verdict]));
			}

			return {
				...node,
				attributes: {
					...node.attributes,
					class: `${block} ${block}--${layout}`,
				},
				children,
			};
		},
	},
	ComparisonColumn: { block: 'comparison-column', parent: 'Comparison' },
	ComparisonRow: {
		block: 'comparison-row',
		parent: 'Comparison',
		modifiers: { rowType: { source: 'meta', default: 'text' } },
	},
};
