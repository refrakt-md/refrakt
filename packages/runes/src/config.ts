import type { ThemeConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, findMeta, findByDataName, readMeta } from '@refrakt-md/transform';

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

/** Recursively find all nodes with a specific typeof attribute */
function collectByTypeof(children: RendererNode[], typeName: string): SerializedTag[] {
	const results: SerializedTag[] = [];
	for (const c of children) {
		if (isTag(c)) {
			if (c.attributes?.typeof === typeName) {
				results.push(c);
			} else {
				results.push(...collectByTypeof(c.children, typeName));
			}
		}
	}
	return results;
}

/** Read text content from a property span child */
function readPropText(node: SerializedTag, prop: string): string {
	for (const c of node.children) {
		if (isTag(c) && c.attributes?.property === prop) {
			return c.children.filter((ch): ch is string => typeof ch === 'string').join('');
		}
	}
	return '';
}

/** Core theme configuration — universal rune-to-BEM-block mappings shared by all themes.
 *  Icons are empty; themes provide their own icon SVGs via mergeThemeConfig. */
export const coreConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		// ─── Simple runes (block name only, engine adds BEM classes) ───

		Accordion: { block: 'accordion' },
		AccordionItem: { block: 'accordion-item', parent: 'Accordion', autoLabel: { name: 'header' } },
		Details: { block: 'details', autoLabel: { summary: 'summary' } },
		Grid: { block: 'grid' },
		CodeGroup: {
			block: 'codegroup',
			modifiers: { title: { source: 'meta' } },
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
		},
		PageSection: { block: 'page-section' },
		TableOfContents: { block: 'toc' },
		Embed: {
			block: 'embed',
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
					const prop = child.attributes.property;
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
		Breadcrumb: { block: 'breadcrumb' },
		BreadcrumbItem: { block: 'breadcrumb-item', parent: 'Breadcrumb' },
		Budget: {
			block: 'budget',
			modifiers: {
				title: { source: 'meta' },
				currency: { source: 'meta', default: 'USD' },
				travelers: { source: 'meta', default: '1' },
				duration: { source: 'meta' },
				showPerPerson: { source: 'meta', default: 'true' },
				showPerDay: { source: 'meta', default: 'true' },
				style: { source: 'meta', default: 'detailed' },
			},
			structure: {
				header: {
					tag: 'div', before: true,
					conditionAny: ['title', 'currency', 'travelers', 'duration'],
					children: [
						{ tag: 'h2', ref: 'title', metaText: 'title', condition: 'title' },
						{
							tag: 'div', ref: 'meta',
							children: [
								{ tag: 'span', ref: 'meta-item', metaText: 'currency', condition: 'currency' },
								{ tag: 'span', ref: 'meta-item', metaText: 'travelers', textPrefix: 'Travelers: ', condition: 'travelers' },
								{ tag: 'span', ref: 'meta-item', metaText: 'duration', textPrefix: 'Duration: ', condition: 'duration' },
							],
						},
					],
				},
			},
			postTransform(node) {
				const block = 'rf-budget';
				const catBlock = 'rf-budget-category';

				const currency = readMeta(node, 'currency') || 'USD';
				const travelersStr = readMeta(node, 'travelers') || '1';
				const travelers = parseInt(travelersStr) || 1;
				const duration = readMeta(node, 'duration') || '';
				const showPerPerson = readMeta(node, 'showPerPerson') !== 'false';
				const showPerDay = readMeta(node, 'showPerDay') !== 'false';

				const symbol = BUDGET_CURRENCY_SYMBOLS[currency.toUpperCase()] || currency + ' ';

				// Find all BudgetCategory children and compute totals
				const categories = collectByTypeof(node.children, 'BudgetCategory');
				let grandTotal = 0;

				for (const cat of categories) {
					const label = readPropText(cat, 'label');
					const subtotalStr = readPropText(cat, 'subtotal');
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
			modifiers: { estimate: { source: 'meta', default: 'false' } },
		},
		BudgetLineItem: { block: 'budget-line-item', parent: 'Budget' },

		// ─── Runes with modifier meta tags ───

		Hint: {
			block: 'hint',
			modifiers: { hintType: { source: 'meta', default: 'note' } },
			contextModifiers: { 'Hero': 'in-hero', 'Feature': 'in-feature' },
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
			modifiers: {
				size: { source: 'meta', default: 'default' },
				align: { source: 'meta', default: 'center' },
			},
		},
		Sidenote: {
			block: 'sidenote',
			modifiers: { style: { source: 'meta', default: 'sidenote' } },
		},
		Compare: {
			block: 'compare',
			modifiers: { layout: { source: 'meta', default: 'side-by-side' } },
		},
		Conversation: { block: 'conversation' },
		ConversationMessage: {
			block: 'conversation-message',
			parent: 'Conversation',
			modifiers: { alignment: { source: 'meta', default: 'left' } },
		},
		Annotate: {
			block: 'annotate',
			modifiers: { style: { source: 'meta', default: 'margin' } },
		},
		AnnotateNote: { block: 'annotate-note', parent: 'Annotate' },
		Nav: {
			block: 'nav',
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
					if (isTag(child) && child.name === 'span' && child.attributes.property === 'slug') {
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
		},
		Chart: {
			block: 'chart',
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
			modifiers: {
				align: { source: 'meta', default: 'center' },
				style: { source: 'meta', default: 'default' },
			},
		},
		TextBlock: {
			block: 'textblock',
			modifiers: {
				dropcap: { source: 'meta' },
				columns: { source: 'meta' },
				lead: { source: 'meta' },
				align: { source: 'meta', default: 'left' },
			},
		},
		MediaText: {
			block: 'mediatext',
			modifiers: {
				align: { source: 'meta', default: 'left' },
				ratio: { source: 'meta', default: '1:1' },
				wrap: { source: 'meta' },
			},
		},

		// ─── Interactive runes (still get BEM classes, components add behavior) ───

		TabGroup: { block: 'tabs' },
		Tab: { block: 'tab', parent: 'TabGroup' },
		DataTable: {
			block: 'datatable',
			modifiers: {
				searchable: { source: 'meta', default: 'false' },
				sortable: { source: 'meta' },
				pageSize: { source: 'meta', default: '0' },
				defaultSort: { source: 'meta' },
			},
		},
		Form: {
			block: 'form',
			modifiers: {
				style: { source: 'meta', default: 'stacked' },
				action: { source: 'meta' },
				method: { source: 'meta', default: 'POST' },
				success: { source: 'meta' },
				error: { source: 'meta' },
				honeypot: { source: 'meta', default: 'true' },
			},
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
			modifiers: {
				mode: { source: 'meta', default: 'click' },
			},
		},
		RevealStep: { block: 'reveal-step', parent: 'Reveal' },
		Diagram: {
			block: 'diagram',
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
		Sandbox: {
			block: 'sandbox',
			postTransform(node) {
				// Read meta values
				const content = readMeta(node, 'content') || '';
				const framework = readMeta(node, 'framework') || '';
				const dependencies = readMeta(node, 'dependencies') || '';
				const label = readMeta(node, 'label') || '';
				const height = readMeta(node, 'height') || 'auto';

				// Keep non-meta children (fallback pre, source panels)
				const fallbackChildren = node.children.filter(child => {
					if (!isTag(child)) return true;
					if (child.name === 'meta') return false;
					return true;
				});

				// Add hidden content div for web component
				const children = [
					...fallbackChildren,
					makeTag('div', { 'data-content': 'source', style: 'display:none' }, [content]),
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
					},
					children,
				};
			},
		},
	},
};

/** @deprecated Use `coreConfig` instead. Alias kept for backwards compatibility during transition. */
export const baseConfig = coreConfig;
