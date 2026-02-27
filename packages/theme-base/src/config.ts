import type { ThemeConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, findMeta, findByDataName, readMeta } from '@refrakt-md/transform';

// ─── Comparison postTransform helpers ───

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

/** Read meta tag value from within a node (for non-modifier metas not consumed by engine) */
function readLocalMeta(node: SerializedTag, prop: string): string {
	for (const c of node.children) {
		if (isTag(c) && c.name === 'meta' && c.attributes?.property === prop) {
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

/** Base theme configuration — universal rune-to-BEM-block mappings shared by all themes.
 *  Icons are empty; themes provide their own icon SVGs via mergeThemeConfig. */
export const baseConfig: ThemeConfig = {
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
		Testimonial: {
			block: 'testimonial',
			postTransform(node) {
				const block = node.attributes.class?.split(' ')[0] || 'rf-testimonial';
				const ratingStr = readMeta(node, 'rating');

				// Filter out consumed meta tags, wrap remaining children in content div
				const contentChildren = node.children.filter(child => {
					if (!isTag(child) || child.name !== 'meta') return true;
					return child.attributes.property !== 'rating';
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
		Timeline: { block: 'timeline', modifiers: { direction: { source: 'meta', default: 'vertical' } } },
		TimelineEntry: { block: 'timeline-entry', parent: 'Timeline' },
		Changelog: { block: 'changelog' },
		ChangelogRelease: { block: 'changelog-release', parent: 'Changelog' },
		Event: {
			block: 'event',
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				date: { source: 'meta' },
				endDate: { source: 'meta' },
				location: { source: 'meta' },
				url: { source: 'meta' },
			},
			structure: {
				details: {
					tag: 'div', before: true,
					children: [
						{
							tag: 'div', ref: 'detail', condition: 'date',
							children: [
								{ tag: 'span', ref: 'label', children: ['Date'] },
								{ tag: 'span', ref: 'value', metaText: 'date' },
								{ tag: 'span', ref: 'end-date', metaText: 'endDate', textPrefix: ' — ', condition: 'endDate' },
							],
						},
						{
							tag: 'div', ref: 'detail', condition: 'location',
							children: [
								{ tag: 'span', ref: 'label', children: ['Location'] },
								{ tag: 'span', ref: 'value', metaText: 'location' },
							],
						},
						{
							tag: 'a', ref: 'register', condition: 'url',
							attrs: { href: { fromModifier: 'url' } },
							children: ['Register'],
						},
					],
				},
			},
		},
		Organization: { block: 'organization' },
		Cast: { block: 'cast' },
		CastMember: { block: 'cast-member', parent: 'Cast' },
		Recipe: {
			block: 'recipe',
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				prepTime: { source: 'meta' },
				cookTime: { source: 'meta' },
				servings: { source: 'meta' },
				difficulty: { source: 'meta', default: 'medium' },
			},
			structure: {
				meta: {
					tag: 'div', before: true,
					conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
					children: [
						{ tag: 'span', ref: 'meta-item', metaText: 'prepTime', transform: 'duration', textPrefix: 'Prep: ', condition: 'prepTime' },
						{ tag: 'span', ref: 'meta-item', metaText: 'cookTime', transform: 'duration', textPrefix: 'Cook: ', condition: 'cookTime' },
						{ tag: 'span', ref: 'meta-item', metaText: 'servings', textPrefix: 'Serves: ', condition: 'servings' },
						{ tag: 'span', ref: 'badge', metaText: 'difficulty', condition: 'difficulty' },
					],
				},
			},
		},
		RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
		Pricing: { block: 'pricing' },
		Tier: { block: 'tier', parent: 'Pricing' },
		FeaturedTier: { block: 'tier', parent: 'Pricing', staticModifiers: ['featured'] },
		Feature: { block: 'feature', modifiers: { split: { source: 'meta' }, mirror: { source: 'meta' } }, contextModifiers: { 'Hero': 'in-hero', 'Grid': 'in-grid' } },
		FeatureDefinition: { block: 'feature-definition', parent: 'Feature' },
		Steps: { block: 'steps' },
		Step: { block: 'step', parent: 'Steps', modifiers: { split: { source: 'meta' }, mirror: { source: 'meta' } } },
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
		Api: {
			block: 'api',
			contentWrapper: { tag: 'div', ref: 'body' },
			modifiers: {
				method: { source: 'meta', default: 'GET' },
				path: { source: 'meta' },
				auth: { source: 'meta' },
			},
			structure: {
				header: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'method', metaText: 'method' },
						{ tag: 'code', ref: 'path', metaText: 'path' },
						{ tag: 'span', ref: 'auth', metaText: 'auth', condition: 'auth' },
					],
				},
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
		MusicPlaylist: { block: 'music-playlist' },
		MusicRecording: { block: 'music-recording', parent: 'MusicPlaylist' },

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
		Hero: {
			block: 'hero',
			modifiers: { align: { source: 'meta', default: 'center' } },
			contextModifiers: { 'Feature': 'in-feature' },
		},
		CallToAction: { block: 'cta', contextModifiers: { 'Hero': 'in-hero', 'Pricing': 'in-pricing' } },
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
		Storyboard: {
			block: 'storyboard',
			modifiers: {
				style: { source: 'meta', default: 'clean' },
				columns: { source: 'meta', default: '3' },
			},
			styles: { columns: '--sb-columns' },
		},
		StoryboardPanel: { block: 'storyboard-panel', parent: 'Storyboard' },
		Bento: {
			block: 'bento',
			modifiers: {
				columns: { source: 'meta', default: '4' },
				gap: { source: 'meta', default: '1rem' },
			},
			styles: {
				columns: '--bento-columns',
				gap: '--bento-gap',
			},
		},
		BentoCell: {
			block: 'bento-cell',
			parent: 'Bento',
			modifiers: { size: { source: 'meta', default: 'medium' } },
			autoLabel: { name: 'title' },
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
				const columns = collectByTypeof(node.children, 'ComparisonColumn');

				// Extract structured data from each column
				const columnData: ComparisonColData[] = columns.map(col => ({
					name: readPropText(col, 'name'),
					highlighted: readLocalMeta(col, 'highlighted') === 'true',
					rows: collectByTypeof(col.children, 'ComparisonRow'),
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
		HowTo: {
			block: 'howto',
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				estimatedTime: { source: 'meta' },
				difficulty: { source: 'meta', default: 'medium' },
			},
			structure: {
				meta: {
					tag: 'div', before: true,
					conditionAny: ['estimatedTime', 'difficulty'],
					children: [
						{ tag: 'span', ref: 'meta-item', metaText: 'estimatedTime', transform: 'duration', textPrefix: 'Estimated time: ', condition: 'estimatedTime' },
						{ tag: 'span', ref: 'meta-item', metaText: 'difficulty', textPrefix: 'Difficulty: ', condition: 'difficulty' },
					],
				},
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
		Map: {
			block: 'map',
			modifiers: {
				style: { source: 'meta', default: 'street' },
				height: { source: 'meta', default: 'medium' },
			},
			postTransform(node) {
				// Move remaining meta values to data attributes for the web component
				const metaProps = ['zoom', 'center', 'provider', 'interactive', 'route', 'cluster', 'apiKey'] as const;
				const dataAttrs: Record<string, string> = {};
				for (const prop of metaProps) {
					const val = readMeta(node, prop);
					if (val) {
						const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
						dataAttrs[`data-${kebab}`] = val;
					}
				}

				// Remove consumed meta children
				const children = node.children.filter(child => {
					if (!isTag(child) || child.name !== 'meta') return true;
					const prop = child.attributes.property;
					return !(metaProps as readonly string[]).includes(prop);
				});

				return {
					...node,
					name: 'rf-map',
					attributes: { ...node.attributes, ...dataAttrs },
					children,
				};
			},
		},
		MapPin: { block: 'map-pin', parent: 'Map' },
		Preview: {
			block: 'preview',
			modifiers: {
				theme: { source: 'meta', default: 'auto' },
				width: { source: 'meta', default: 'wide' },
				responsive: { source: 'meta' },
				title: { source: 'meta' },
			},
			postTransform(node) {
				// Generate themed HTML when source mode is active.
				// This must happen in postTransform (not the rune) because it needs
				// the fully-transformed tree with BEM classes and structural elements.
				const hasSource = node.children.some(
					c => isTag(c) && c.name === 'pre' && c.attributes.property === 'source'
				);
				if (!hasSource) return node;

				// Extract content children (skip meta, source, htmlSource, themedSource)
				const contentChildren = node.children.filter(c => {
					if (!isTag(c)) return true;
					if (c.name === 'meta' && c.attributes.property) return false;
					if (c.name === 'pre' && c.attributes.property) return false;
					return true;
				});

				const html = renderToHtml(contentChildren, { pretty: true });
				if (!html) return node;

				const themedPre: SerializedTag = makeTag('pre', {
					property: 'themedSource',
					'data-language': 'html',
				}, [
					makeTag('code', { 'data-language': 'html' }, [html]),
				]);

				return { ...node, children: [...node.children, themedPre] };
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
		Symbol: {
			block: 'symbol',
			contentWrapper: { tag: 'div', ref: 'body' },
			modifiers: {
				kind: { source: 'meta', default: 'function' },
				lang: { source: 'meta', default: 'typescript' },
				since: { source: 'meta' },
				deprecated: { source: 'meta' },
				source: { source: 'meta' },
			},
			structure: {
				header: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'kind-badge', metaText: 'kind' },
						{ tag: 'span', ref: 'lang-badge', metaText: 'lang' },
						{ tag: 'span', ref: 'since-badge', metaText: 'since', textPrefix: 'Since ', condition: 'since' },
						{ tag: 'span', ref: 'deprecated-badge', metaText: 'deprecated', textPrefix: 'Deprecated ', condition: 'deprecated' },
						{ tag: 'a', ref: 'source-link', condition: 'source', attrs: { href: { fromModifier: 'source' } }, children: ['Source'] },
					],
				},
			},
		},
		SymbolGroup: { block: 'symbol-group', parent: 'Symbol' },
		SymbolMember: { block: 'symbol-member', parent: 'Symbol' },

		// ─── Design runes ───

		Swatch: { block: 'swatch' },
		Palette: {
			block: 'palette',
			modifiers: {
				title: { source: 'meta' },
				showContrast: { source: 'meta' },
				showA11y: { source: 'meta' },
				columns: { source: 'meta' },
			},
			contextModifiers: { DesignContext: 'in-design-context' },
		},
		Typography: {
			block: 'typography',
			modifiers: {
				title: { source: 'meta' },
				showSizes: { source: 'meta' },
				showWeights: { source: 'meta' },
				showCharset: { source: 'meta' },
			},
			contextModifiers: { DesignContext: 'in-design-context' },
		},
		Spacing: {
			block: 'spacing',
			modifiers: {
				title: { source: 'meta' },
			},
			contextModifiers: { DesignContext: 'in-design-context' },
		},
		DesignContext: {
			block: 'design-context',
			modifiers: {
				title: { source: 'meta' },
			},
		},
	},
};
