import type { ThemeConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, findMeta, findByDataName, readMeta, resolveGap, ratioToFr, resolveOffset, resolveValign, parsePlacement } from '@refrakt-md/transform';
import type { PackagePipelineHooks, TransformedPage, EntityRegistry, AggregatedData, PipelineContext } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable } from './lib/index.js';
import { BREADCRUMB_AUTO_SENTINEL } from './tags/breadcrumb.js';
import { NAV_AUTO_SENTINEL } from './tags/nav.js';
import { XREF_RUNE_MARKER } from './tags/xref.js';

// ─── Budget postTransform helpers ───

const BUDGET_CURRENCY_SYMBOLS: Record<string, string> = {
	USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
	AUD: 'A$', CAD: 'C$', CHF: 'CHF ', SEK: 'kr', NOK: 'kr', DKK: 'kr',
	INR: '₹', KRW: '₩', BRL: 'R$', MXN: 'MX$', ZAR: 'R',
};

function formatBudgetAmount(amount: number, symbol: string): string {
	const parts = (amount % 1 === 0 ? String(amount) : amount.toFixed(2)).split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return symbol + parts.join('.');
}

function parseBudgetDays(duration: string): number {
	let days = 0;
	const dayMatch = duration.match(/(\d+)\s*day/i);
	const weekMatch = duration.match(/(\d+)\s*week/i);
	const monthMatch = duration.match(/(\d+)\s*month/i);
	if (dayMatch) days += parseInt(dayMatch[1]);
	if (weekMatch) days += parseInt(weekMatch[1]) * 7;
	if (monthMatch) days += parseInt(monthMatch[1]) * 30;
	if (days === 0) {
		const num = parseInt(duration);
		if (!isNaN(num)) days = num;
	}
	return days;
}

function parseBudgetAmount(str: string): number {
	const cleaned = str.replace(/[€$£¥₹₩\s]/g, '').replace(/,/g, '');
	const range = cleaned.match(/^([\d.]+)\s*[-–]\s*([\d.]+)/);
	if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
}

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
	for (const c of node.children) {
		if (isTag(c) && c.attributes?.['data-field'] === prop.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()) {
			return c.children.filter((ch): ch is string => typeof ch === 'string').join('');
		}
	}
	return '';
}

/** autoLabel entries shared by all PageSection-based runes */
const pageSectionAutoLabel = {
	header: 'preamble',   // <header> wrapper element → data-name="preamble"
	eyebrow: 'eyebrow',   // property="eyebrow"
	headline: 'headline', // property="headline"
	blurb: 'blurb',       // property="blurb"
	image: 'image',       // property="image"
};

/** Core theme configuration — universal rune-to-BEM-block mappings shared by all themes.
 *  Icons are empty; themes provide their own icon SVGs via mergeThemeConfig. */
export const coreConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		// ─── Simple runes (block name only, engine adds BEM classes) ───

		Accordion: { block: 'accordion', defaultDensity: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
		AccordionItem: { block: 'accordion-item', parent: 'Accordion', rootAttributes: { 'data-state': 'closed' }, autoLabel: { name: 'header' }, editHints: { header: 'inline', body: 'none' } },
		Details: { block: 'details', autoLabel: { summary: 'summary' }, editHints: { summary: 'inline', body: 'none' } },
		Grid: {
			block: 'grid',
			defaultDensity: 'full',
			childDensity: 'compact',
			modifiers: {
				mode: { source: 'meta', default: 'columns' },
				collapse: { source: 'meta', noBemClass: true },
				aspect: { source: 'meta', noBemClass: true },
				stack: { source: 'meta', noBemClass: true },
				ratio: { source: 'meta', noBemClass: true },
				valign: { source: 'meta', noBemClass: true },
				gap: { source: 'meta', noBemClass: true },
				min: { source: 'meta', noBemClass: true },
			},
			styles: {
				ratio: { prop: '--grid-ratio', transform: ratioToFr },
				valign: { prop: '--grid-valign', transform: resolveValign },
				gap: { prop: '--grid-gap', transform: resolveGap },
				min: '--grid-min',
				aspect: '--grid-aspect',
			},
			editHints: { cell: 'none' },
		},
		CodeGroup: {
			block: 'codegroup',
			defaultDensity: 'compact',
			modifiers: { title: { source: 'meta', noBemClass: true }, overflow: { source: 'meta', default: 'scroll' } },
			structure: {
				topbar: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'title', metaText: 'title', condition: 'title' },
					],
				},
			},
			sections: { topbar: 'header', title: 'title' },
			editHints: { panel: 'code', title: 'none' },
		},
		PageSection: { block: 'page-section' },
		TableOfContents: { block: 'toc' },
		Embed: {
			block: 'embed',
			defaultDensity: 'compact',
			editHints: { fallback: 'none' },
			postTransform(node) {
				const block = node.attributes.class?.split(' ')[0] || 'rf-embed';
				const embedUrl = readMeta(node, 'embedUrl') || readMeta(node, 'url') || '';
				const title = readMeta(node, 'title') || 'Embedded content';
				const aspect = readMeta(node, 'aspect') || '16:9';
				const provider = readMeta(node, 'provider') || '';

				const [w, h] = aspect.split(':').map(Number);
				const paddingPercent = h && w ? (h / w) * 100 : 56.25;

				// Filter out consumed meta tags
				const contentChildren = node.children.filter(child => {
					if (!isTag(child) || child.name !== 'meta') return true;
					const prop = child.attributes['data-field'];
					return !['embedUrl', 'url', 'title', 'aspect', 'provider', 'type'].includes(prop);
				});

				const children: (SerializedTag | string)[] = [];
				if (embedUrl) {
					children.push(
						makeTag('div', { class: `${block}__wrapper`, style: `padding-bottom: ${paddingPercent}%` }, [
							makeTag('iframe', {
								src: embedUrl,
								title,
								frameborder: '0',
								allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
								allowfullscreen: '',
								loading: 'lazy',
							}, []),
						])
					);
				}
				children.push(makeTag('div', { class: `${block}__fallback` }, contentChildren));

				return {
					...node,
					attributes: {
						...node.attributes,
						...(provider ? { 'data-provider': provider } : {}),
					},
					children,
				};
			},
		},
		Breadcrumb: { block: 'breadcrumb', defaultDensity: 'minimal', editHints: { items: 'none' } },
		BreadcrumbItem: { block: 'breadcrumb-item', parent: 'Breadcrumb' },
		Blog: {
			block: 'blog',
			defaultDensity: 'full',
			sections: { preamble: 'preamble', headline: 'title', blurb: 'description', content: 'body' },
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				layout: { source: 'meta', default: 'list' },
				sort: { source: 'meta', default: 'date-desc', noBemClass: true },
				filter: { source: 'meta', noBemClass: true },
				limit: { source: 'meta', noBemClass: true },
				folder: { source: 'meta', noBemClass: true },
			},
			autoLabel: pageSectionAutoLabel,
			editHints: { headline: 'inline', blurb: 'inline' },
		},
		Budget: {
			block: 'budget',
			defaultDensity: 'full',
			sections: { header: 'header', preamble: 'preamble', headline: 'title', footer: 'footer' },
			editHints: { headline: 'inline', meta: 'none', 'meta-item': 'none' },
			modifiers: {
				currency: { source: 'meta', default: 'USD' },
				travelers: { source: 'meta', default: '1' },
				duration: { source: 'meta' },
				showPerPerson: { source: 'meta', default: 'true' },
				showPerDay: { source: 'meta', default: 'true' },
				variant: { source: 'meta', default: 'detailed' },
			},
			structure: {
				header: {
					tag: 'div', before: true,
					conditionAny: ['currency', 'travelers', 'duration'],
					children: [
						{
							tag: 'div', ref: 'meta',
							children: [
								{ tag: 'span', ref: 'meta-item', metaText: 'currency', condition: 'currency', metaType: 'category', metaRank: 'primary' },
								{ tag: 'span', ref: 'meta-item', metaText: 'travelers', label: 'Travelers:', condition: 'travelers', metaType: 'quantity', metaRank: 'primary' },
								{ tag: 'span', ref: 'meta-item', metaText: 'duration', label: 'Duration:', condition: 'duration', metaType: 'temporal', metaRank: 'secondary' },
							],
						},
					],
				},
			},
			postTransform(node) {
				const block = 'rf-budget';
				const catBlock = 'rf-budget-category';

				// Read from data-* attributes (set by engine after consuming meta tags)
				const currency = node.attributes['data-currency'] || 'USD';
				const travelersStr = node.attributes['data-travelers'] || '1';
				const travelers = parseInt(travelersStr) || 1;
				const duration = node.attributes['data-duration'] || '';
				const showPerPerson = node.attributes['data-show-per-person'] !== 'false';
				const showPerDay = node.attributes['data-show-per-day'] !== 'false';

				const symbol = BUDGET_CURRENCY_SYMBOLS[currency.toUpperCase()] || currency + ' ';

				// Find all BudgetCategory children and compute totals
				const categories = collectByRune(node.children, 'budget-category');
				let grandTotal = 0;

				for (const cat of categories) {
					// Read from data attributes set by engine from label/subtotal modifiers
					const label = cat.attributes['data-label'] || '';
					const subtotalStr = cat.attributes['data-subtotal'] || '0';
					const subtotal = parseFloat(subtotalStr) || 0;
					grandTotal += subtotal;

					// Inject category header with label and formatted subtotal
					const catHeader = makeTag('div', { class: `${catBlock}__header` }, [
						makeTag('span', { class: `${catBlock}__label` }, [label]),
						makeTag('span', { class: `${catBlock}__subtotal` }, [formatBudgetAmount(subtotal, symbol)]),
					]);
					cat.children.unshift(catHeader);
				}

				// Build footer with totals
				const footerChildren: (SerializedTag | string)[] = [
					makeTag('div', { class: `${block}__total` }, [
						makeTag('span', { class: `${block}__total-label` }, ['Total']),
						makeTag('span', { class: `${block}__total-amount` }, [formatBudgetAmount(grandTotal, symbol)]),
					]),
				];

				if (travelers > 1 && showPerPerson) {
					const perPerson = grandTotal / travelers;
					footerChildren.push(
						makeTag('div', { class: `${block}__per-person` }, [
							makeTag('span', { class: `${block}__per-person-label` }, ['Per person']),
							makeTag('span', { class: `${block}__per-person-amount` }, [formatBudgetAmount(perPerson, symbol)]),
						])
					);
				}

				if (duration && showPerDay) {
					const days = parseBudgetDays(duration);
					if (days > 0) {
						const perDay = grandTotal / days;
						footerChildren.push(
							makeTag('div', { class: `${block}__per-day` }, [
								makeTag('span', { class: `${block}__per-day-label` }, ['Per day']),
								makeTag('span', { class: `${block}__per-day-amount` }, [formatBudgetAmount(perDay, symbol)]),
							])
						);
					}
				}

				const footer = makeTag('div', { class: `${block}__footer` }, footerChildren);

				return {
					...node,
					children: [...node.children, footer],
				};
			},
		},
		BudgetCategory: {
			block: 'budget-category',
			parent: 'Budget',
			modifiers: {
				estimate: { source: 'meta', default: 'false' },
				label: { source: 'meta', noBemClass: true },
				subtotal: { source: 'meta', noBemClass: true },
			},
			editHints: { label: 'none', subtotal: 'none' },
		},
		BudgetLineItem: { block: 'budget-line-item', parent: 'Budget' },

		// ─── Runes with modifier meta tags ───

		Hint: {
			block: 'hint',
			defaultDensity: 'compact',
			modifiers: { hintType: { source: 'meta', default: 'note' } },
			contextModifiers: { 'hero': 'in-hero', 'feature': 'in-feature' },
			sections: { header: 'header' },
			editHints: { icon: 'none', title: 'none' },
			structure: {
				header: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
						{ tag: 'span', ref: 'title', metaText: 'hintType' },
					],
				},
			},
		},
		Figure: {
			block: 'figure',
			defaultDensity: 'compact',
			modifiers: {
				size: { source: 'meta', default: 'default' },
				align: { source: 'meta', default: 'center' },
			},
			sections: { caption: 'description' },
			editHints: { caption: 'inline' },
		},
		Gallery: {
			block: 'gallery',
			defaultDensity: 'full',
			childDensity: 'compact',
			modifiers: {
				layout: { source: 'meta', default: 'grid' },
				lightbox: { source: 'meta', default: 'true', noBemClass: true },
				gap: { source: 'meta', default: 'default', noBemClass: true },
				columns: { source: 'meta', noBemClass: true },
			},
			styles: {
				columns: '--gallery-columns',
				gap: { prop: '--gallery-gap', transform: resolveGap },
			},
			editHints: { items: 'none' },
		},
		Sidenote: {
			block: 'sidenote',
			defaultDensity: 'full',
			modifiers: { variant: { source: 'meta', default: 'sidenote' } },
			sections: { body: 'body' },
			editHints: { body: 'inline' },
		},
		Compare: {
			block: 'compare',
			defaultDensity: 'full',
			modifiers: { layout: { source: 'meta', default: 'side-by-side' } },
			editHints: { panels: 'none' },
		},
		Conversation: { block: 'conversation', defaultDensity: 'compact', editHints: { messages: 'none' } },
		ConversationMessage: {
			block: 'conversation-message',
			parent: 'Conversation',
			modifiers: { align: { source: 'meta', default: 'left' } },
			editHints: { body: 'inline' },
		},
		Annotate: {
			block: 'annotate',
			defaultDensity: 'full',
			modifiers: { variant: { source: 'meta', default: 'margin' } },
			sections: { body: 'body' },
			editHints: { body: 'none', notes: 'none' },
		},
		AnnotateNote: { block: 'annotate-note', parent: 'Annotate', editHints: { body: 'inline' } },
		Nav: {
			block: 'nav',
			defaultDensity: 'compact',
			postTransform(node) {
				return { ...node, name: 'rf-nav' };
			},
		},
		NavGroup: { block: 'nav-group', parent: 'Nav' },
		NavItem: {
			block: 'nav-item',
			parent: 'Nav',
			postTransform(node) {
				// Extract slug from span[property="slug"] child → data-slug attribute
				// Keep slug text as visible fallback for SSR; web component replaces with <a> links
				let slug = '';
				const children = node.children.filter(child => {
					if (isTag(child) && child.name === 'span' && child.attributes['data-field'] === 'slug') {
						slug = child.children.filter((c): c is string => typeof c === 'string').join('');
						return false; // remove slug span from DOM
					}
					return true;
				});

				// Add slug text as visible fallback content (replaced by web component at runtime)
				if (slug) {
					children.unshift(slug);
				}

				return {
					...node,
					attributes: {
						...node.attributes,
						...(slug ? { 'data-slug': slug } : {}),
					},
					children,
				};
			},
		},
		Diff: {
			block: 'diff',
			modifiers: { mode: { source: 'meta', default: 'unified' } },
			editHints: { line: 'none', 'gutter-num': 'none', 'gutter-prefix': 'none', 'line-content': 'none' },
		},
		Chart: {
			block: 'chart',
			defaultDensity: 'compact',
			editHints: { data: 'none' },
			postTransform(node) {
				const block = node.attributes.class?.split(' ')[0] || 'rf-chart';
				const chartType = readMeta(node, 'type') || 'bar';
				const title = readMeta(node, 'title') || '';
				const dataJson = findByDataName(node, 'data')?.attributes?.content || '{}';

				let chartData: { headers: string[]; rows: string[][] } = { headers: [], rows: [] };
				try { chartData = JSON.parse(dataJson); } catch { /* fallback */ }

				const colors = [
					'var(--rf-color-info)', 'var(--rf-color-success)',
					'var(--rf-color-warning)', 'var(--rf-color-danger)',
					'#7c3aed', '#0891b2',
				];

				const svgW = 600, svgH = 300;
				const pad = { top: 30, right: 20, bottom: 40, left: 50 };
				const cw = svgW - pad.left - pad.right;
				const ch = svgH - pad.top - pad.bottom;

				const labels = chartData.rows.map(r => r[0] || '');
				const series = chartData.headers.slice(1);
				const values = chartData.rows.map(r => r.slice(1).map(v => parseFloat(v) || 0));
				const maxVal = Math.max(...values.flat(), 1);

				const bgw = cw / Math.max(labels.length, 1);
				const bw = bgw / Math.max(series.length + 1, 2);

				// Build SVG children
				const svgChildren: SerializedTag[] = [];

				// Axes
				svgChildren.push(makeTag('line', {
					x1: String(pad.left), y1: String(pad.top),
					x2: String(pad.left), y2: String(svgH - pad.bottom),
					stroke: 'var(--rf-color-border)', 'stroke-width': '1',
				}, []));
				svgChildren.push(makeTag('line', {
					x1: String(pad.left), y1: String(svgH - pad.bottom),
					x2: String(svgW - pad.right), y2: String(svgH - pad.bottom),
					stroke: 'var(--rf-color-border)', 'stroke-width': '1',
				}, []));

				if (chartType === 'bar') {
					for (let i = 0; i < labels.length; i++) {
						for (let si = 0; si < series.length; si++) {
							const h = (values[i][si] / maxVal) * ch;
							svgChildren.push(makeTag('rect', {
								x: String(pad.left + i * bgw + si * bw + bw * 0.25),
								y: String(pad.top + ch - h),
								width: String(bw * 0.75),
								height: String(h),
								style: `fill: ${colors[si % colors.length]}`,
								rx: '2',
							}, []));
						}
						svgChildren.push(makeTag('text', {
							x: String(pad.left + i * bgw + bgw / 2),
							y: String(svgH - pad.bottom + 20),
							'text-anchor': 'middle', 'font-size': '12',
							fill: 'var(--rf-color-muted)',
						}, [labels[i]]));
					}
				} else if (chartType === 'line') {
					for (let si = 0; si < series.length; si++) {
						const pts = labels.map((_, i) =>
							`${pad.left + i * bgw + bgw / 2},${pad.top + ch - (values[i][si] / maxVal) * ch}`
						).join(' ');
						svgChildren.push(makeTag('polyline', {
							points: pts, fill: 'none',
							style: `stroke: ${colors[si % colors.length]}`,
							'stroke-width': '2',
						}, []));
						for (let i = 0; i < labels.length; i++) {
							svgChildren.push(makeTag('circle', {
								cx: String(pad.left + i * bgw + bgw / 2),
								cy: String(pad.top + ch - (values[i][si] / maxVal) * ch),
								r: '4',
								style: `fill: ${colors[si % colors.length]}`,
							}, []));
						}
					}
					for (let i = 0; i < labels.length; i++) {
						svgChildren.push(makeTag('text', {
							x: String(pad.left + i * bgw + bgw / 2),
							y: String(svgH - pad.bottom + 20),
							'text-anchor': 'middle', 'font-size': '12',
							fill: 'var(--rf-color-muted)',
						}, [labels[i]]));
					}
				}

				const children: (SerializedTag | string)[] = [];
				if (title) {
					children.push(makeTag('figcaption', { class: `${block}__title` }, [title]));
				}
				children.push(makeTag('div', { class: `${block}__container` }, [
					makeTag('svg', {
						viewBox: `0 0 ${svgW} ${svgH}`,
						class: `${block}__svg`,
					}, svgChildren),
				]));

				// Legend
				if (series.length > 1) {
					const legendItems = series.map((name, i) =>
						makeTag('span', { class: `${block}__legend-item` }, [
							makeTag('span', {
								class: `${block}__legend-color`,
								style: `background: ${colors[i % colors.length]};`,
							}, []),
							name,
						])
					);
					children.push(makeTag('div', { class: `${block}__legend` }, legendItems));
				}

				return { ...node, children };
			},
		},

		// ─── Text formatting & layout runes ───

		PullQuote: {
			block: 'pullquote',
			defaultDensity: 'compact',
			modifiers: {
				align: { source: 'meta', default: 'center' },
				variant: { source: 'meta', default: 'default' },
			},
			sections: { body: 'body' },
			editHints: { body: 'inline' },
		},
		TextBlock: {
			block: 'textblock',
			defaultDensity: 'full',
			modifiers: {
				dropcap: { source: 'meta' },
				columns: { source: 'meta' },
				lead: { source: 'meta' },
				align: { source: 'meta', default: 'left' },
			},
			sections: { body: 'body' },
			editHints: { body: 'none' },
		},
		MediaText: {
			block: 'mediatext',
			defaultDensity: 'full',
			modifiers: {
				align: { source: 'meta', default: 'left' },
				ratio: { source: 'meta', default: '1:1' },
				wrap: { source: 'meta' },
			},
			sections: { body: 'body', media: 'media' },
			mediaSlots: { media: 'cover' },
			editHints: { media: 'image', body: 'none' },
		},

		Showcase: {
			block: 'showcase',
			defaultDensity: 'compact',
			childDensity: 'compact',
			sections: { viewport: 'body' },
			modifiers: {
				shadow: { source: 'meta', default: 'none' },
				bleed: { source: 'meta', default: 'none' },
				aspect: { source: 'meta', noBemClass: true },
				offset: { source: 'meta', noBemClass: true },
				place: { source: 'meta', noBemClass: true },
			},
			contextModifiers: { 'bento-cell': 'in-bento-cell' },
			styles: {
				offset: { prop: '--showcase-offset', transform: resolveOffset },
				aspect: '--showcase-aspect',
			},
			editHints: { viewport: 'none' },
			postTransform(node, context) {
				const placeValue = context.modifiers['place'];
				if (placeValue) {
					const { x, y } = parsePlacement(placeValue);
					const existing = node.attributes.style || '';
					const placeParts = `--place-x: ${x}; --place-y: ${y}`;
					node.attributes.style = existing ? `${existing}; ${placeParts}` : placeParts;
				}
				return node;
			},
		},

		// ─── Interactive runes (still get BEM classes, components add behavior) ───

		TabGroup: { block: 'tabs', defaultDensity: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
		Tab: { block: 'tab', parent: 'TabGroup', rootAttributes: { 'data-state': 'inactive' }, editHints: { name: 'inline' } },
		TabPanel: { block: 'tab-panel', parent: 'TabGroup', rootAttributes: { 'data-state': 'inactive' } },
		DataTable: {
			block: 'datatable',
			defaultDensity: 'compact',
			sections: { table: 'body' },
			modifiers: {
				searchable: { source: 'meta', default: 'false' },
				sortable: { source: 'meta' },
				pageSize: { source: 'meta', default: '0' },
				defaultSort: { source: 'meta' },
			},
			editHints: { table: 'none' },
		},
		Form: {
			block: 'form',
			defaultDensity: 'full',
			sections: { body: 'body' },
			modifiers: {
				variant: { source: 'meta', default: 'stacked' },
				action: { source: 'meta' },
				method: { source: 'meta', default: 'POST' },
				success: { source: 'meta' },
				error: { source: 'meta' },
				honeypot: { source: 'meta', default: 'true' },
			},
			editHints: { body: 'none' },
		},
		FormField: {
			block: 'form-field',
			parent: 'Form',
			modifiers: {
				fieldType: { source: 'meta' },
			},
		},
		Reveal: {
			block: 'reveal',
			defaultDensity: 'full',
			modifiers: {
				mode: { source: 'meta', default: 'click' },
			},
			sections: { preamble: 'preamble', headline: 'title', blurb: 'description' },
			autoLabel: pageSectionAutoLabel,
			editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', steps: 'none' },
		},
		RevealStep: { block: 'reveal-step', parent: 'Reveal', rootAttributes: { 'data-state': 'closed' }, editHints: { body: 'none' } },
		Juxtapose: {
			block: 'juxtapose',
			defaultDensity: 'compact',
			modifiers: {
				variant: { source: 'meta', default: 'slider' },
				orientation: { source: 'meta', default: 'vertical', noBemClass: true },
				position: { source: 'meta', default: '50', noBemClass: true },
				duration: { source: 'meta', default: '1000', noBemClass: true },
			},
			styles: {
				position: '--jx-position',
				duration: '--jx-duration',
			},
			editHints: { panels: 'none' },
		},
		JuxtaposePanel: { block: 'juxtapose-panel', parent: 'Juxtapose', rootAttributes: { 'data-state': 'inactive' }, editHints: { body: 'none' } },
		Diagram: {
			block: 'diagram',
			defaultDensity: 'compact',
			editHints: { source: 'code' },
			postTransform(node) {
				const block = node.attributes.class?.split(' ')[0] || 'rf-diagram';
				const language = readMeta(node, 'language') || 'mermaid';
				const title = readMeta(node, 'title') || '';
				const sourceMeta = findByDataName(node, 'source');
				const source = sourceMeta?.attributes?.content || '';

				// Build fallback HTML (visible in SSR, replaced by web component)
				const children: (SerializedTag | string)[] = [];
				if (title) {
					children.push(makeTag('figcaption', { class: `${block}__title` }, [title]));
				}
				const containerChildren: (SerializedTag | string)[] = source
					? [makeTag('pre', { class: `${block}__source` }, [makeTag('code', {}, [source])])]
					: [];
				children.push(makeTag('div', { class: `${block}__container` }, containerChildren));

				// Hidden source for web component to read
				if (source) {
					children.push(makeTag('div', { 'data-content': 'source', style: 'display:none' }, [source]));
				}

				return {
					...node,
					name: 'rf-diagram',
					attributes: { ...node.attributes, 'data-language': language },
					children,
				};
			},
		},
		Tint: { block: 'tint', parent: '*' },
		Bg: { block: 'bg', parent: '*' },
		Region: { block: 'region', parent: 'Layout' },
		Sandbox: {
			block: 'sandbox',
			defaultDensity: 'compact',
			editHints: { source: 'code' },
			postTransform(node) {
				// Read meta values
				const content = readMeta(node, 'content') || '';
				const framework = readMeta(node, 'framework') || '';
				const dependencies = readMeta(node, 'dependencies') || '';
				const label = readMeta(node, 'label') || '';
				const height = readMeta(node, 'height') || 'auto';
				const designTokens = readMeta(node, 'design-tokens') || '';

				// Keep non-meta children (fallback pre) and extract source panels
				const fallbackChildren: typeof node.children = [];
				const sourcePanelOrigins: string[] = [];
				for (const child of node.children) {
					if (!isTag(child)) { fallbackChildren.push(child); continue; }
					if (child.name === 'meta') {
						// Collect origin data from source panels
						if (child.attributes?.['data-field'] === 'source-panel' && child.attributes?.['data-origin']) {
							sourcePanelOrigins.push(`${child.attributes['data-label'] || ''}\t${child.attributes['data-origin']}`);
						}
						continue;
					}
					fallbackChildren.push(child);
				}

				// Wrap fallback and source in <template> tags (inert/invisible).
				// Using <template> instead of <div> avoids HTML parser issues:
				// when <rf-sandbox> is inside <p>, block elements like <pre> or
				// <div> cause <p> to auto-close, pushing children out of the
				// custom element. <template> is parsed but never rendered.
				const children = [
					...(fallbackChildren.length > 0
						? [makeTag('template', { 'data-content': 'fallback' }, fallbackChildren)]
						: []),
					makeTag('template', { 'data-content': 'source' }, [content]),
				];

				return {
					...node,
					name: 'rf-sandbox',
					attributes: {
						...node.attributes,
						'data-source-content': content,
						...(framework ? { 'data-framework': framework } : {}),
						...(dependencies ? { 'data-dependencies': dependencies } : {}),
						...(label ? { 'data-label': label } : {}),
						'data-height': height,
						...(designTokens ? { 'data-design-tokens': designTokens } : {}),
						...(sourcePanelOrigins.length > 0 ? { 'data-source-origins': sourcePanelOrigins.join('\n') } : {}),
					},
					children,
				};
			},
		},
	},
};

/** @deprecated Use `coreConfig` instead. Alias kept for backwards compatibility during transition. */
export const baseConfig = coreConfig;

// ─── Cross-page pipeline helpers ───

/** Node in the page tree built from registered page entities */
export interface PageTreeNode {
	url: string;
	title: string;
	children: PageTreeNode[];
}

/** Build a page tree from a flat list of page entities */
function buildPageTree(
	pages: Array<{ url: string; title: string; parentUrl: string }>,
): PageTreeNode {
	const byUrl = new Map<string, PageTreeNode>();

	// Create nodes for all pages
	for (const p of pages) {
		byUrl.set(p.url, { url: p.url, title: p.title, children: [] });
	}

	const root: PageTreeNode = { url: '/', title: 'Root', children: [] };

	// Attach each page to its parent
	for (const p of pages) {
		const node = byUrl.get(p.url)!;
		if (p.url === '/') {
			// Root page merges into the virtual root
			root.title = p.title;
			root.children = node.children;
			byUrl.set('/', root);
		} else {
			const parent = byUrl.get(p.parentUrl) ?? root;
			parent.children.push(node);
		}
	}

	return root;
}

/** Build breadcrumb paths: url → ordered ancestor urls (root first, parent last) */
function buildBreadcrumbPaths(
	pages: Array<{ url: string; parentUrl: string }>,
): Map<string, string[]> {
	const parentOf = new Map<string, string>();
	for (const p of pages) {
		if (p.url !== '/') {
			parentOf.set(p.url, p.parentUrl);
		}
	}

	const paths = new Map<string, string[]>();
	for (const p of pages) {
		const ancestors: string[] = [];
		let current = parentOf.get(p.url);
		while (current !== undefined) {
			ancestors.unshift(current);
			current = parentOf.get(current);
		}
		paths.set(p.url, ancestors);
	}

	return paths;
}

/** Derive the parent url by stripping the last path segment */
function deriveParentUrl(url: string): string {
	if (url === '/' || !url.includes('/')) return '/';
	// '/docs/guide/' → strip trailing slash, then strip last segment
	const trimmed = url.endsWith('/') ? url.slice(0, -1) : url;
	const parent = trimmed.lastIndexOf('/');
	return parent <= 0 ? '/' : trimmed.slice(0, parent + 1);
}

/** Walk a Markdoc renderable tree, resolving any auto-breadcrumb placeholders */
function resolveAutoBreadcrumbs(
	renderable: unknown,
	pageUrl: string,
	breadcrumbPaths: Map<string, string[]>,
	pagesByUrl: Map<string, { url: string; title: string }>,
	ctx: PipelineContext,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveAutoBreadcrumbs(c, pageUrl, breadcrumbPaths, pagesByUrl, ctx)
			);
			// Return original if nothing changed
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	// Check if this is a Breadcrumb auto placeholder
	if (tag.attributes?.['data-rune'] === 'breadcrumb') {
		const hasSentinel = tag.children?.some(
			(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === BREADCRUMB_AUTO_SENTINEL
		);

		if (hasSentinel) {
			return buildAutoBreadcrumb(tag, pageUrl, breadcrumbPaths, pagesByUrl, ctx);
		}
	}

	// Recurse into children
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveAutoBreadcrumbs(c, pageUrl, breadcrumbPaths, pagesByUrl, ctx)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

/** Build a resolved breadcrumb Tag from the page hierarchy */
function buildAutoBreadcrumb(
	originalTag: any,
	pageUrl: string,
	breadcrumbPaths: Map<string, string[]>,
	pagesByUrl: Map<string, { url: string; title: string }>,
	ctx: PipelineContext,
): unknown {
	const ancestorUrls = breadcrumbPaths.get(pageUrl);
	if (ancestorUrls === undefined) {
		ctx.warn(`Breadcrumb auto: page URL "${pageUrl}" not found in page registry`, pageUrl);
		return originalTag;
	}

	// Find separator from existing meta child
	const separatorMeta = originalTag.children?.find(
		(c: any) => Tag.isTag(c) && c.name === 'meta' && !c.attributes?.['data-field']
	);
	const separator = separatorMeta?.attributes?.content ?? '/';

	// Build breadcrumb items: ancestor pages + current page (no link)
	const listItems: any[] = [];

	for (const ancestorUrl of ancestorUrls) {
		const ancestorPage = pagesByUrl.get(ancestorUrl);
		if (!ancestorPage) continue;

		const nameSpan = new Tag('span', { hidden: true }, [ancestorPage.title]);
		const urlLink = new Tag('a', { href: ancestorUrl }, [ancestorPage.title]);

		listItems.push(
			createComponentRenderable({ rune: 'breadcrumb-item', schemaOrgType: 'ListItem',
				tag: 'li',
				properties: { name: nameSpan, url: urlLink },
				children: [nameSpan, urlLink],
			}) as any
		);
	}

	// Add current page as the last item (no link)
	const currentPage = pagesByUrl.get(pageUrl);
	const currentTitle = currentPage?.title ?? pageUrl;
	const currentSpan = new Tag('span', {}, [currentTitle]);
	listItems.push(
		createComponentRenderable({ rune: 'breadcrumb-item', schemaOrgType: 'ListItem',
			tag: 'li',
			properties: { name: currentSpan },
			children: [currentSpan],
		}) as any
	);

	const newSeparatorMeta = new Tag('meta', { content: separator });
	const itemsList = new Tag('ol', {}, listItems);

	return createComponentRenderable({ rune: 'breadcrumb', schemaOrgType: 'BreadcrumbList',
		tag: 'nav',
		properties: { separator: newSeparatorMeta },
		refs: { items: itemsList },
		children: [newSeparatorMeta, itemsList],
	});
}

/** Walk a Markdoc renderable tree, resolving any auto-nav placeholders */
function resolveAutoNavs(
	renderable: unknown,
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	ctx: PipelineContext,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveAutoNavs(c, pageUrl, pagesByUrl, ctx)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	// Check if this is a Nav auto placeholder
	if (tag.attributes?.['data-rune'] === 'nav') {
		const hasSentinel = tag.children?.some(
			(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === NAV_AUTO_SENTINEL
		);

		if (hasSentinel) {
			return buildAutoNav(pageUrl, pagesByUrl, ctx);
		}
	}

	// Recurse into children
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveAutoNavs(c, pageUrl, pagesByUrl, ctx)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

/** Build a resolved nav Tag from the direct children of the current page */
function buildAutoNav(
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	ctx: PipelineContext,
): unknown {
	// Find direct children: pages whose parentUrl is this page's URL (excluding self)
	const children = Array.from(pagesByUrl.values()).filter(
		p => p.parentUrl === pageUrl && p.url !== pageUrl,
	);

	if (children.length === 0) {
		ctx.warn(`Nav auto: page '${pageUrl}' has no registered child pages`, pageUrl);
	}

	const listItems: any[] = children.map(child => {
		const titleSpan = new Tag('span', { 'data-field': 'slug' }, [child.title]);
		const link = new Tag('a', { href: child.url }, [titleSpan]);

		return createComponentRenderable({ rune: 'nav-item',
			tag: 'li',
			properties: { slug: titleSpan },
			children: [link],
		});
	});

	const itemsList = new Tag('ul', {}, listItems);

	return createComponentRenderable({ rune: 'nav',
		tag: 'nav',
		properties: {
			group: [],
			item: listItems,
		},
		children: [itemsList],
	});
}

// ─── Blog pipeline helpers ───

interface BlogPostData {
	title: string;
	url: string;
	date: string;
	description: string;
	draft: boolean;
	frontmatter: Record<string, unknown>;
}

function walkBlogTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => void): void {
	if (Tag.isTag(node)) {
		fn(node);
		for (const child of node.children) walkBlogTags(child, fn);
	} else if (Array.isArray(node)) {
		node.forEach(n => walkBlogTags(n, fn));
	}
}

function mapBlogTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => unknown): unknown {
	if (Tag.isTag(node)) {
		const mapped = fn(node);
		if (mapped !== node) return mapped;
		const newChildren = node.children.map(c => mapBlogTags(c, fn));
		const changed = newChildren.some((c, i) => c !== node.children[i]);
		return changed ? new Tag(node.name, node.attributes, newChildren as any[]) : node;
	}
	if (Array.isArray(node)) return node.map(n => mapBlogTags(n, fn));
	return node;
}

/** Normalise folder path for prefix matching: ensure leading slash and trailing slash */
function normaliseFolderPath(folder: string): string {
	let f = folder.trim();
	if (!f.startsWith('/')) f = '/' + f;
	if (!f.endsWith('/')) f += '/';
	return f;
}

/** Check if a page URL is a direct child of the given folder */
function isInFolder(pageUrl: string, folder: string): boolean {
	if (!pageUrl.startsWith(folder)) return false;
	const rest = pageUrl.slice(folder.length);
	const segments = rest.replace(/\/$/, '').split('/').filter(Boolean);
	return segments.length === 1;
}

/** Parse a simple filter expression like "tag:javascript" into field/value pairs */
function parseBlogFilter(filter: string): Array<{ field: string; value: string }> {
	if (!filter || !filter.trim()) return [];
	return filter.split(',').map(part => {
		const colonIdx = part.indexOf(':');
		if (colonIdx === -1) return { field: part.trim(), value: '' };
		return {
			field: part.slice(0, colonIdx).trim(),
			value: part.slice(colonIdx + 1).trim(),
		};
	});
}

/** Check if a post's frontmatter matches all filter conditions */
function matchesBlogFilter(post: BlogPostData, filters: Array<{ field: string; value: string }>): boolean {
	for (const { field, value } of filters) {
		const fmValue = post.frontmatter[field];
		if (value === '') {
			if (fmValue === undefined || fmValue === null) return false;
		} else if (Array.isArray(fmValue)) {
			if (!fmValue.some(v => String(v).toLowerCase() === value.toLowerCase())) return false;
		} else {
			if (String(fmValue ?? '').toLowerCase() !== value.toLowerCase()) return false;
		}
	}
	return true;
}

/** Sort blog posts by the specified order */
function sortBlogPosts(posts: BlogPostData[], sort: string): BlogPostData[] {
	const sorted = [...posts];
	switch (sort) {
		case 'date-asc':
			sorted.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
			break;
		case 'title-asc':
			sorted.sort((a, b) => a.title.localeCompare(b.title));
			break;
		case 'title-desc':
			sorted.sort((a, b) => b.title.localeCompare(a.title));
			break;
		case 'date-desc':
		default:
			sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
			break;
	}
	return sorted;
}

/** Build an <article> Tag for a single blog post entry */
function createBlogPostTag(post: BlogPostData): InstanceType<typeof Tag> {
	const titleTag = new Tag('h3', {}, [
		new Tag('a', { href: post.url }, [post.title]),
	]);

	const children: any[] = [titleTag];

	if (post.date) {
		children.push(new Tag('time', { datetime: post.date }, [post.date]));
	}

	if (post.description) {
		children.push(new Tag('p', {}, [post.description]));
	}

	return new Tag('article', { 'data-name': 'post' }, children);
}

/** Resolve blog runes in a renderable tree by injecting matching posts */
function resolveBlogPosts(
	renderable: unknown,
	allPosts: BlogPostData[],
	ctx: PipelineContext,
	pageUrl: string,
): unknown {
	let modified = false;
	const result = mapBlogTags(renderable, (tag) => {
		if (tag.attributes['data-rune'] !== 'blog') return tag;

		const folderMeta = tag.children.find(
			(c: unknown) => Tag.isTag(c) && c.attributes['data-field'] === 'folder',
		);
		const sortMeta = tag.children.find(
			(c: unknown) => Tag.isTag(c) && c.attributes['data-field'] === 'sort',
		);
		const filterMeta = tag.children.find(
			(c: unknown) => Tag.isTag(c) && c.attributes['data-field'] === 'filter',
		);
		const limitMeta = tag.children.find(
			(c: unknown) => Tag.isTag(c) && c.attributes['data-field'] === 'limit',
		);

		const folder = Tag.isTag(folderMeta) ? (folderMeta.attributes.content as string) : '';
		const sort = Tag.isTag(sortMeta) ? (sortMeta.attributes.content as string) : 'date-desc';
		const filterStr = Tag.isTag(filterMeta) ? (filterMeta.attributes.content as string) : '';
		const limitStr = Tag.isTag(limitMeta) ? (limitMeta.attributes.content as string) : '';
		const limit = limitStr ? parseInt(limitStr, 10) : undefined;

		if (!folder) {
			ctx.warn('Blog rune missing folder attribute', pageUrl);
			return tag;
		}

		const normalised = normaliseFolderPath(folder);
		const filters = parseBlogFilter(filterStr);

		let posts = allPosts.filter(post => {
			if (post.draft) return false;
			if (!isInFolder(post.url, normalised)) return false;
			if (filters.length > 0 && !matchesBlogFilter(post, filters)) return false;
			return true;
		});

		posts = sortBlogPosts(posts, sort);

		if (limit && limit > 0) {
			posts = posts.slice(0, limit);
		}

		const postsContainer = tag.children.find(
			(c: unknown) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
		);

		if (!Tag.isTag(postsContainer)) return tag;

		const postTags = posts.map(createBlogPostTag);

		modified = true;
		const newPostsContainer = new Tag(postsContainer.name, postsContainer.attributes, postTags);
		const newChildren = tag.children.map((c: unknown) =>
			c === postsContainer ? newPostsContainer : c,
		);
		return new Tag(tag.name, tag.attributes, newChildren as any[]);
	});

	return modified ? result : renderable;
}

// ─── Xref resolution helpers ───

/**
 * Find an entity by exact ID across all types in the registry.
 * If typeHint is provided, only search that type.
 */
function findEntityById(
	registry: Readonly<EntityRegistry>,
	id: string,
	typeHint?: string,
): { entity: import('@refrakt-md/types').EntityRegistration; ambiguous: false } | undefined {
	const types = typeHint ? [typeHint] : registry.getTypes();
	for (const type of types) {
		const entity = registry.getById(type, id);
		if (entity) return { entity, ambiguous: false };
	}
	return undefined;
}

/**
 * Find entities by name/title match (case-insensitive) across all types.
 * If typeHint is provided, only search that type.
 */
function findEntitiesByName(
	registry: Readonly<EntityRegistry>,
	name: string,
	typeHint?: string,
): import('@refrakt-md/types').EntityRegistration[] {
	const nameLower = name.toLowerCase();
	const types = typeHint ? [typeHint] : registry.getTypes();
	const matches: import('@refrakt-md/types').EntityRegistration[] = [];

	for (const type of types) {
		for (const entity of registry.getAll(type)) {
			const entityName = (entity.data.name as string) ?? '';
			const entityTitle = (entity.data.title as string) ?? '';
			if (entityName.toLowerCase() === nameLower || entityTitle.toLowerCase() === nameLower) {
				matches.push(entity);
			}
		}
	}

	return matches;
}

/** Resolve an entity's URL for use as an href */
function resolveEntityHref(entity: import('@refrakt-md/types').EntityRegistration): string {
	const baseUrl = (entity.data.url as string) || entity.sourceUrl;
	const headingId = entity.data.headingId as string | undefined;
	if (headingId) return `${baseUrl}#${headingId}`;
	return baseUrl;
}

/** Walk a Markdoc renderable tree, resolving any xref placeholders */
function resolveXrefs(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry>,
	ctx: PipelineContext,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveXrefs(c, pageUrl, registry, ctx)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	// Check if this is an xref placeholder
	if (tag.attributes?.['data-rune'] === XREF_RUNE_MARKER) {
		const id = tag.attributes['data-xref-id'] as string;
		const label = tag.attributes['data-xref-label'] as string | undefined;
		const typeHint = tag.attributes['data-xref-type'] as string | undefined;

		// Try exact ID match first
		const idMatch = findEntityById(registry, id, typeHint);
		if (idMatch) {
			const entity = idMatch.entity;
			const href = resolveEntityHref(entity);
			const text = label || (entity.data.title as string) || (entity.data.name as string) || (entity.data.text as string) || id;

			if (entity.sourceUrl === pageUrl) {
				ctx.info(`xref "${id}" on ${pageUrl} — references itself`, pageUrl);
			}

			return new Tag('a', {
				class: `rf-xref rf-xref--${entity.type}`,
				href,
				'data-entity-type': entity.type,
				'data-entity-id': entity.id,
			}, [text]);
		}

		// Try name/title match
		const nameMatches = findEntitiesByName(registry, id, typeHint);

		if (nameMatches.length === 1) {
			const entity = nameMatches[0];
			const href = resolveEntityHref(entity);
			const text = label || (entity.data.title as string) || (entity.data.name as string) || (entity.data.text as string) || id;

			if (entity.sourceUrl === pageUrl) {
				ctx.info(`xref "${id}" on ${pageUrl} — references itself`, pageUrl);
			}

			return new Tag('a', {
				class: `rf-xref rf-xref--${entity.type}`,
				href,
				'data-entity-type': entity.type,
				'data-entity-id': entity.id,
			}, [text]);
		}

		if (nameMatches.length > 1) {
			const matchList = nameMatches
				.map(e => `${e.type} "${(e.data.title as string) || (e.data.name as string) || e.id}" on ${e.sourceUrl}`)
				.join(', ');
			ctx.warn(
				`xref "${id}" on ${pageUrl} — matches ${nameMatches.length} entities (${matchList}). Add type hint to disambiguate.`,
				pageUrl,
			);

			// Use first match
			const entity = nameMatches[0];
			const href = resolveEntityHref(entity);
			const text = label || (entity.data.title as string) || (entity.data.name as string) || (entity.data.text as string) || id;

			return new Tag('a', {
				class: `rf-xref rf-xref--${entity.type}`,
				href,
				'data-entity-type': entity.type,
				'data-entity-id': entity.id,
			}, [text]);
		}

		// No match — unresolved
		ctx.warn(`xref "${id}" on ${pageUrl} — entity not found`, pageUrl);
		return new Tag('span', {
			class: 'rf-xref rf-xref--unresolved',
			'data-entity-id': id,
		}, [label || id]);
	}

	// Recurse into children
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveXrefs(c, pageUrl, registry, ctx)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

/**
 * Core cross-page pipeline hooks.
 * Run for every site, before any community package hooks.
 * Registers page and heading entities, aggregates the page tree and breadcrumb paths,
 * and resolves blog post listings.
 */
export const corePipelineHooks: PackagePipelineHooks = {
	register(pages: readonly TransformedPage[], registry: EntityRegistry, ctx: PipelineContext): void {
		for (const page of pages) {
			const parentUrl = deriveParentUrl(page.url);

			const existingPage = registry.getById('page', page.url);
			if (existingPage && existingPage.sourceUrl !== page.url) {
				ctx.warn(
					`Page '${page.url}' already registered from '${existingPage.sourceUrl}'`,
					page.url,
				);
			}

			registry.register({
				type: 'page',
				id: page.url,
				sourceUrl: page.url,
				data: {
					title: page.title,
					url: page.url,
					parentUrl,
					draft: page.frontmatter.draft ?? false,
					description: page.frontmatter.description,
					date: page.frontmatter.date,
					order: page.frontmatter.order,
				},
			});

			for (const h of page.headings) {
				const headingId = `${page.url}#${h.id}`;
				const existingHeading = registry.getById('heading', headingId);
				if (existingHeading && existingHeading.sourceUrl !== page.url) {
					ctx.warn(
						`Heading '${headingId}' already registered from '${existingHeading.sourceUrl}'`,
						page.url,
					);
				}
				registry.register({
					type: 'heading',
					id: headingId,
					sourceUrl: page.url,
					data: { level: h.level, text: h.text, headingId: h.id, url: page.url },
				});
			}
		}
	},

	aggregate(registry: Readonly<EntityRegistry>, ctx: PipelineContext) {
		const pageEntities = registry.getAll('page') as unknown as Array<{
			id: string;
			data: { url: string; title: string; parentUrl: string };
		}>;

		const pages = pageEntities.map(e => ({
			url: e.data.url,
			title: e.data.title,
			parentUrl: e.data.parentUrl,
		}));

		const pageTree = buildPageTree(pages);
		const breadcrumbPaths = buildBreadcrumbPaths(pages);

		// Quick lookup: url → { url, title } for postProcess use
		const pagesByUrl = new Map(pages.map(p => [p.url, p]));

		// Build heading index: "url#id" → heading data
		const headingIndex = new Map<string, Record<string, unknown>>();
		for (const h of registry.getAll('heading')) {
			headingIndex.set(h.id, h.data);
		}

		// Blog: collect all pages as potential blog posts
		const allPosts: BlogPostData[] = pageEntities.map(e => ({
			title: (e.data as any).title as string || '',
			url: (e.data as any).url as string || e.id,
			date: (e.data as any).date as string || '',
			description: (e.data as any).description as string || '',
			draft: (e.data as any).draft as boolean || false,
			frontmatter: e.data as Record<string, unknown>,
		}));

		return { pageTree, breadcrumbPaths, pagesByUrl, headingIndex, allPosts, registry };
	},

	postProcess(page: TransformedPage, aggregated: AggregatedData, ctx: PipelineContext): TransformedPage {
		const coreData = aggregated['__core__'] as {
			breadcrumbPaths: Map<string, string[]>;
			pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>;
			allPosts: BlogPostData[];
			registry: Readonly<EntityRegistry>;
		} | undefined;

		if (!coreData) return page;

		let renderable = resolveAutoBreadcrumbs(
			page.renderable,
			page.url,
			coreData.breadcrumbPaths,
			coreData.pagesByUrl,
			ctx,
		);

		renderable = resolveAutoNavs(
			renderable,
			page.url,
			coreData.pagesByUrl,
			ctx,
		);

		renderable = resolveBlogPosts(
			renderable,
			coreData.allPosts,
			ctx,
			page.url,
		);

		renderable = resolveXrefs(
			renderable,
			page.url,
			coreData.registry,
			ctx,
		);

		if (renderable === page.renderable) return page;
		return { ...page, renderable };
	},
};
