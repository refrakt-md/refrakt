import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Markdoc from '@markdoc/markdoc';
import { tags as coreTags, nodes, extractHeadings, runeTagMap, defineRune, serializeTree, coreConfig, escapeFenceTags, resolveXrefs } from '@refrakt-md/runes';
import { createTransform, renderToHtml, mergeThemeConfig, planLayout } from '@refrakt-md/transform';
import type { ThemeConfig, LayoutPageData } from '@refrakt-md/transform';
import type { RendererNode, SerializedTag, TransformedPage, EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { renderFullPage as htmlRenderFullPage } from '@refrakt-md/html';
import type { HtmlTheme, PageShellOptions } from '@refrakt-md/html';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { HighlightTransform } from '@refrakt-md/highlight';
import { plan } from '../index.js';
import { planPipelineHooks, setScannerDependencies, type PlanAggregatedData } from '../pipeline.js';
import { scanPlanFiles } from '../scanner.js';
import { getGitTimestamps, getStatTimestamps, type FileTimestamps } from '@refrakt-md/content';
import type { PlanEntity } from '../types.js';

// --- Markdoc tag registry (built once) ---

const packageRunes: Record<string, any> = {};
for (const [name, entry] of Object.entries(plan.runes)) {
	packageRunes[name] = defineRune({ name, schema: entry.transform as any, aliases: entry.aliases });
}
const tags = { ...coreTags, ...runeTagMap(packageRunes), ...Markdoc.tags };

// --- Types ---

export interface ProcessedPage {
	url: string;
	title: string;
	type: string;
	entityId: string;
	status: string;
	renderable: RendererNode;
	filePath: string;
	headings: Array<{ level: number; text: string; id: string }>;
}

export interface NavGroup {
	title: string;
	type: string;
	items: NavItem[];
	statusGroups: NavStatusGroup[];
}

export interface NavStatusGroup {
	status: string;
	label: string;
	items: NavItem[];
	collapsed: boolean;
}

export interface NavItem {
	url: string;
	label: string;
	id: string;
	status: string;
	priority?: string;
	tags?: string;
	assignee?: string;
	milestone?: string;
	severity?: string;
	hasUnresolvedBlockers?: boolean;
}

export interface PipelineResult {
	pages: ProcessedPage[];
	dashboard: ProcessedPage;
	nav: NavGroup[];
	navRegion: RendererNode[];
	themeCss: string;
	highlightCss: string;
}

export interface PipelineOptions {
	dir: string;
	specsDir?: string;
	theme: string;
	baseUrl: string;
}

// --- Theme resolution ---

function inlineCssImports(css: string, cssDir: string): string {
	return css.replace(/@import\s+['"]\.\/([^'"]+)['"]\s*;/g, (_match, file) => {
		const importPath = path.join(cssDir, file);
		if (fs.existsSync(importPath)) {
			return fs.readFileSync(importPath, 'utf-8');
		}
		return _match;
	});
}

/** Well-known shorthand names mapped to npm package names. */
const THEME_SHORTHANDS: Record<string, string> = {
	lumina: '@refrakt-md/lumina',
};

/**
 * Try to read the `theme` field from refrakt.config.json in the working directory.
 * Returns the theme package name or undefined if no config / no theme field.
 */
function readConfigTheme(): string | undefined {
	const candidates = [
		path.resolve('refrakt.config.json'),
		path.resolve('site', 'refrakt.config.json'),
	];

	for (const configPath of candidates) {
		if (!fs.existsSync(configPath)) continue;
		try {
			const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
			if (typeof raw === 'object' && raw !== null && typeof raw.theme === 'string' && raw.theme) {
				return raw.theme;
			}
		} catch {
			// Malformed config — silently skip
		}
	}
	return undefined;
}

/**
 * Resolve a theme package name to its base CSS content.
 * Tries `require.resolve(pkg + '/base.css')` first, then the main export.
 * Returns undefined if the package can't be resolved.
 */
function resolvePackageThemeCss(packageName: string): string | undefined {
	// Try main export first (full theme with rune styles), then base.css (tokens only)
	for (const subpath of ['', '/base.css']) {
		try {
			const entry = subpath
				? import.meta.resolve(packageName + subpath)
				: import.meta.resolve(packageName);
			const resolved = entry.startsWith('file://') ? fileURLToPath(entry) : entry;
			if (resolved.endsWith('.css') && fs.existsSync(resolved)) {
				return inlineCssImports(fs.readFileSync(resolved, 'utf-8'), path.dirname(resolved));
			}
		} catch {
			// Not resolvable — continue
		}
	}
	return undefined;
}

function resolveThemeCss(theme: string): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const stylesDir = path.resolve(__dirname, '../../styles');

	// Minimal is self-contained — no shell or theme layering needed
	if (theme === 'minimal') {
		return inlineCssImports(fs.readFileSync(path.join(stylesDir, 'minimal.css'), 'utf-8'), stylesDir);
	}

	// Shell CSS (CLI layout: sidebar, dashboard, TOC, cross-refs, relationships)
	// is appended to all non-minimal themes. Rune styling comes from the theme.
	const shellCss = inlineCssImports(
		fs.readFileSync(path.join(stylesDir, 'default.css'), 'utf-8'),
		stylesDir,
	);

	// Resolve the theme CSS (rune styling + design tokens)
	let themeCss: string | undefined;

	if (theme === 'default') {
		// Default theme: use Lumina for rune styling
		themeCss = resolvePackageThemeCss('@refrakt-md/lumina');
		if (!themeCss) {
			console.warn('[plan] Warning: @refrakt-md/lumina could not be resolved. Rune styling will be missing.');
		}
	} else if (theme === 'auto') {
		// Auto: read from refrakt.config.json, fall back to Lumina
		const configTheme = readConfigTheme();
		if (configTheme) {
			themeCss = resolvePackageThemeCss(configTheme);
			if (!themeCss) {
				console.warn(`[plan] Warning: Could not resolve theme "${configTheme}" from config. Falling back to Lumina.`);
			}
		}
		if (!themeCss) {
			themeCss = resolvePackageThemeCss('@refrakt-md/lumina');
		}
	} else {
		// Shorthand name (e.g., "lumina" → "@refrakt-md/lumina")
		const expanded = THEME_SHORTHANDS[theme];
		if (expanded) {
			themeCss = resolvePackageThemeCss(expanded);
			if (!themeCss) {
				throw new Error(`Theme "${theme}" (${expanded}) could not be resolved. Is it installed?`);
			}
		} else if (theme.startsWith('@') || theme.includes('/')) {
			// npm package name
			themeCss = resolvePackageThemeCss(theme);
			if (!themeCss) {
				throw new Error(`Theme package "${theme}" could not be resolved. Is it installed?`);
			}
		} else if (fs.existsSync(theme)) {
			// File path
			themeCss = inlineCssImports(fs.readFileSync(theme, 'utf-8'), path.dirname(theme));
		} else {
			throw new Error(`Theme not found: "${theme}". Use "default", "minimal", a package name, or a path to a CSS file.`);
		}
	}

	return (themeCss ? themeCss + '\n' : '') + shellCss;
}

function buildThemeConfig(): ThemeConfig {
	const planRuneConfigs = plan.theme?.runes ?? {};
	return mergeThemeConfig(coreConfig, { runes: planRuneConfigs as any });
}

// --- Markdoc rendering ---

function parseAndTransform(content: string, filePath: string, fileTimestamps?: FileTimestamps): { renderable: unknown; title: string; headings: Array<{ level: number; text: string; id: string; knownSection?: string }> } {
	const ast = Markdoc.parse(escapeFenceTags(content));
	const headings = extractHeadings(ast);
	const config = {
		tags,
		nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: filePath,
			headings,
			__source: content,
			...(fileTimestamps ? { file: { created: fileTimestamps.created, modified: fileTimestamps.modified } } : {}),
		},
	};
	const renderable = Markdoc.transform(ast, config);
	const title = headings.length > 0 ? headings[0].text : '';

	// Annotate headings with known-section data from the rendered tree.
	// buildSections adds data-known-section to heading Tags during transform.
	annotateKnownSections(headings, renderable);

	return { renderable, title, headings };
}

/** Walk the rendered Markdoc Tag tree and annotate HeadingInfo entries
 *  with their canonical known-section name when the heading has
 *  a `data-known-section` attribute set by buildSections. */
function annotateKnownSections(
	headings: Array<{ level: number; text: string; id: string; knownSection?: string }>,
	renderable: unknown,
): void {
	const headingById = new Map(headings.map(h => [h.id, h]));

	function walk(node: unknown): void {
		if (!node || typeof node !== 'object') return;
		if (Array.isArray(node)) {
			for (const child of node) walk(child);
			return;
		}
		if (!Markdoc.Tag.isTag(node)) return;
		const tag = node as InstanceType<typeof Markdoc.Tag>;
		const name = tag.name;
		if (/^h[1-6]$/.test(name) && tag.attributes['data-known-section']) {
			const id = tag.attributes.id as string;
			if (id) {
				const heading = headingById.get(id);
				if (heading) {
					heading.knownSection = tag.attributes['data-known-section'] as string;
				}
			}
		}
		if (tag.children) {
			for (const child of tag.children) walk(child);
		}
	}

	walk(renderable);
}

// --- Entity registry ---

function createRegistry(): { registry: EntityRegistry; entries: EntityRegistration[] } {
	const entries: EntityRegistration[] = [];
	const byTypeAndId = new Map<string, Map<string, EntityRegistration>>();
	const byTypeAndUrl = new Map<string, Map<string, EntityRegistration[]>>();

	const registry: EntityRegistry = {
		register(entry: EntityRegistration) {
			entries.push(entry);
			if (!byTypeAndId.has(entry.type)) byTypeAndId.set(entry.type, new Map());
			// Keep the first registration (entity's own page) — don't overwrite with
			// duplicates from dashboard, status filter pages, etc.
			if (!byTypeAndId.get(entry.type)!.has(entry.id)) {
				byTypeAndId.get(entry.type)!.set(entry.id, entry);
			}
			if (!byTypeAndUrl.has(entry.type)) byTypeAndUrl.set(entry.type, new Map());
			if (!byTypeAndUrl.get(entry.type)!.has(entry.sourceUrl)) byTypeAndUrl.get(entry.type)!.set(entry.sourceUrl, []);
			byTypeAndUrl.get(entry.type)!.get(entry.sourceUrl)!.push(entry);
		},
		getAll(type: string) {
			return [...(byTypeAndId.get(type)?.values() ?? [])];
		},
		getById(type: string, id: string) {
			return byTypeAndId.get(type)?.get(id);
		},
		getByUrl(type: string, url: string) {
			return byTypeAndUrl.get(type)?.get(url) ?? [];
		},
		getTypes() {
			return [...byTypeAndId.keys()];
		},
	};
	return { registry, entries };
}

// --- Navigation builder ---

const NAV_ORDER: Record<string, number> = { milestone: 0, work: 1, bug: 2, spec: 3, decision: 4 };
const NAV_TITLES: Record<string, string> = {
	milestone: 'Milestones',
	work: 'Work Items',
	bug: 'Bugs',
	spec: 'Specs',
	decision: 'Decisions',
};

/** Terminal statuses — collapsed by default in sidebar */
const TERMINAL_STATUSES = new Set([
	'done', 'fixed', 'accepted', 'complete', 'superseded', 'deprecated', 'wontfix', 'duplicate',
]);

/** Status ordering — active statuses first, terminal last */
const STATUS_ORDER: Record<string, number> = {
	'in-progress': 0, confirmed: 1, review: 2, ready: 3, reported: 4,
	active: 5, proposed: 6, planning: 7, draft: 8, pending: 9, blocked: 10,
	done: 20, fixed: 21, accepted: 22, complete: 23,
	superseded: 30, deprecated: 31, wontfix: 32, duplicate: 33,
};

/** Human-readable status labels for group headers */
const STATUS_LABELS_DISPLAY: Record<string, string> = {
	'in-progress': 'In Progress',
	confirmed: 'Confirmed', review: 'Review', ready: 'Ready', reported: 'Reported',
	active: 'Active', proposed: 'Proposed', planning: 'Planning', draft: 'Draft',
	pending: 'Pending', blocked: 'Blocked',
	done: 'Done', fixed: 'Fixed', accepted: 'Accepted', complete: 'Complete',
	superseded: 'Superseded', deprecated: 'Deprecated', wontfix: "Won't Fix", duplicate: 'Duplicate',
};

/** Status ordering per entity type (for nav display) */
const STATUS_ORDER_BY_TYPE: Record<string, string[]> = {
	work: ['in-progress', 'review', 'ready', 'blocked', 'draft', 'pending', 'done'],
	bug: ['in-progress', 'confirmed', 'reported', 'fixed', 'wontfix', 'duplicate'],
	spec: ['review', 'draft', 'accepted', 'superseded', 'deprecated'],
	decision: ['proposed', 'accepted', 'superseded', 'deprecated'],
	milestone: ['active', 'planning', 'complete'],
};

function buildNavigation(entities: PlanEntity[], baseUrl: string): NavGroup[] {
	const groups = new Map<string, NavItem[]>();

	for (const entity of entities) {
		const type = entity.type;
		if (!groups.has(type)) groups.set(type, []);
		const id = entity.attributes.id || entity.attributes.name || '';
		groups.get(type)!.push({
			url: `${baseUrl}${type}/${slugify(id)}.html`,
			label: `${id}${entity.title ? ' ' + entity.title : ''}`,
			id,
			status: entity.attributes.status || '',
			priority: entity.attributes.priority,
			tags: entity.attributes.tags,
			assignee: entity.attributes.assignee,
			milestone: entity.attributes.milestone,
			severity: entity.attributes.severity,
		});
	}

	return [...groups.entries()]
		.sort(([a], [b]) => (NAV_ORDER[a] ?? 99) - (NAV_ORDER[b] ?? 99))
		.map(([type, items]) => {
			const sorted = items.sort((a, b) => a.id.localeCompare(b.id));

			// Group items by status
			const byStatus = new Map<string, NavItem[]>();
			for (const item of sorted) {
				const s = item.status || 'unknown';
				if (!byStatus.has(s)) byStatus.set(s, []);
				byStatus.get(s)!.push(item);
			}

			const statusGroups: NavStatusGroup[] = [...byStatus.entries()]
				.sort(([a], [b]) => (STATUS_ORDER[a] ?? 15) - (STATUS_ORDER[b] ?? 15))
				.map(([status, statusItems]) => ({
					status,
					label: STATUS_LABELS_DISPLAY[status] || status,
					items: statusItems,
					collapsed: TERMINAL_STATUSES.has(status),
				}));

			return {
				title: NAV_TITLES[type] || type,
				type,
				items: sorted,
				statusGroups,
			};
		});
}

/**
 * Convert NavGroup[] to a serialized tag tree for the layout's nav region.
 * Produces BEM-classed elements matching the existing .rf-plan-sidebar__* selectors.
 */
function buildNavRegion(groups: NavGroup[], baseUrl: string, activeUrl?: string, viewDefs?: ViewPageDef[], statusFilterPages?: StatusFilterPageDef[]): RendererNode[] {
	const children: RendererNode[] = [];

	// Title row with search trigger
	children.push({
		$$mdtype: 'Tag',
		name: 'div',
		attributes: { class: 'rf-plan-sidebar__title' },
		children: [
			'Plan',
			{
				$$mdtype: 'Tag',
				name: 'button',
				attributes: {
					class: 'rf-plan-sidebar__search-trigger',
					'aria-label': 'Search',
					'data-search-trigger': '',
				},
				children: [{
					$$mdtype: 'Tag',
					name: 'svg',
					attributes: {
						width: '16',
						height: '16',
						viewBox: '0 0 24 24',
						fill: 'none',
						stroke: 'currentColor',
						'stroke-width': '2',
						'stroke-linecap': 'round',
						'stroke-linejoin': 'round',
					},
					children: [
						{
							$$mdtype: 'Tag',
							name: 'circle',
							attributes: { cx: '11', cy: '11', r: '8' },
							children: [],
						},
						{
							$$mdtype: 'Tag',
							name: 'line',
							attributes: { x1: '21', y1: '21', x2: '16.65', y2: '16.65' },
							children: [],
						},
					],
				}],
			},
		],
	} as unknown as RendererNode);

	// Dashboard link
	const dashActive = activeUrl === baseUrl || activeUrl === `${baseUrl}index.html`;
	children.push({
		$$mdtype: 'Tag',
		name: 'a',
		attributes: {
			class: `rf-plan-sidebar__link rf-plan-sidebar__link--dashboard${dashActive ? ' rf-plan-sidebar__link--active' : ''}`,
			href: baseUrl,
		},
		children: [
			{
				$$mdtype: 'Tag',
				name: 'svg',
				attributes: {
					class: 'rf-plan-sidebar__dashboard-icon',
					width: '14',
					height: '14',
					viewBox: '0 0 24 24',
					fill: 'none',
					stroke: 'currentColor',
					'stroke-width': '2',
					'stroke-linecap': 'round',
					'stroke-linejoin': 'round',
				},
				children: [
					{ $$mdtype: 'Tag', name: 'rect', attributes: { x: '3', y: '3', width: '7', height: '7', rx: '1' }, children: [] },
					{ $$mdtype: 'Tag', name: 'rect', attributes: { x: '14', y: '3', width: '7', height: '7', rx: '1' }, children: [] },
					{ $$mdtype: 'Tag', name: 'rect', attributes: { x: '3', y: '14', width: '7', height: '7', rx: '1' }, children: [] },
					{ $$mdtype: 'Tag', name: 'rect', attributes: { x: '14', y: '14', width: '7', height: '7', rx: '1' }, children: [] },
				],
			},
			'Dashboard',
		],
	} as unknown as RendererNode);

	// Entity groups
	for (const group of groups) {
		const groupChildren: RendererNode[] = [];

		groupChildren.push({
			$$mdtype: 'Tag',
			name: 'div',
			attributes: { class: 'rf-plan-sidebar__group-title' },
			children: [group.title],
		} as unknown as RendererNode);

		// Status links — each links to a filter page instead of listing individual items
		const typeFilterPages = (statusFilterPages ?? []).filter(p => p.type === group.type);
		if (typeFilterPages.length > 0) {
			for (const fp of typeFilterPages) {
				const isActive = fp.url === activeUrl;
				groupChildren.push({
					$$mdtype: 'Tag',
					name: 'a',
					attributes: {
						class: `rf-plan-sidebar__link rf-plan-sidebar__status-link${isActive ? ' rf-plan-sidebar__link--active' : ''}`,
						href: fp.url,
						'data-status': fp.status,
					},
					children: [
						{
							$$mdtype: 'Tag',
							name: 'span',
							attributes: { class: 'rf-plan-sidebar__status-label' },
							children: [STATUS_LABELS_DISPLAY[fp.status] || fp.status],
						} as unknown as RendererNode,
						{
							$$mdtype: 'Tag',
							name: 'span',
							attributes: { class: 'rf-plan-sidebar__status-count' },
							children: [String(fp.count)],
						} as unknown as RendererNode,
					],
				} as unknown as RendererNode);
			}
		} else {
			// Fallback: render status sub-groups with individual item links (legacy behavior)
			for (const sg of group.statusGroups) {
				const subGroupChildren: RendererNode[] = [];

				subGroupChildren.push({
					$$mdtype: 'Tag',
					name: 'button',
					attributes: {
						class: 'rf-plan-sidebar__status-header',
						type: 'button',
						'data-status': sg.status,
						'aria-expanded': sg.collapsed ? 'false' : 'true',
					},
					children: [
						{
							$$mdtype: 'Tag',
							name: 'span',
							attributes: { class: 'rf-plan-sidebar__status-label' },
							children: [sg.label],
						} as unknown as RendererNode,
						{
							$$mdtype: 'Tag',
							name: 'span',
							attributes: { class: 'rf-plan-sidebar__status-count' },
							children: [String(sg.items.length)],
						} as unknown as RendererNode,
					],
				} as unknown as RendererNode);

				const itemNodes: RendererNode[] = [];
				for (const item of sg.items) {
					const isActive = item.url === activeUrl;
					const blockerClass = item.hasUnresolvedBlockers ? ' rf-plan-sidebar__link--blocked' : '';
					const attrs: Record<string, string> = {
						class: `rf-plan-sidebar__link${isActive ? ' rf-plan-sidebar__link--active' : ''}${blockerClass}`,
						href: item.url,
						'data-id': item.id,
						'data-status': item.status,
					};
					if (item.priority) attrs['data-priority'] = item.priority;
					if (item.tags) attrs['data-tags'] = item.tags;
					if (item.assignee) attrs['data-assignee'] = item.assignee;
					if (item.milestone) attrs['data-milestone'] = item.milestone;
					if (item.severity) attrs['data-severity'] = item.severity;
					if (item.hasUnresolvedBlockers) attrs['data-has-blockers'] = 'true';

					const linkChildren: (string | RendererNode)[] = [item.label];
					if (item.hasUnresolvedBlockers) {
						linkChildren.push({
							$$mdtype: 'Tag',
							name: 'span',
							attributes: { class: 'rf-plan-sidebar__blocker-icon', 'aria-label': 'Has unresolved blockers' },
							children: ['\u26A0'],
						} as unknown as RendererNode);
					}

					itemNodes.push({
						$$mdtype: 'Tag',
						name: 'a',
						attributes: attrs,
						children: linkChildren,
					} as unknown as RendererNode);
				}

				subGroupChildren.push({
					$$mdtype: 'Tag',
					name: 'div',
					attributes: {
						class: 'rf-plan-sidebar__status-items',
						...(sg.collapsed ? { hidden: '' } : {}),
					},
					children: itemNodes,
				} as unknown as RendererNode);

				groupChildren.push({
					$$mdtype: 'Tag',
					name: 'div',
					attributes: {
						class: 'rf-plan-sidebar__status-group',
						'data-status': sg.status,
					},
					children: subGroupChildren,
				} as unknown as RendererNode);
			}
		}

		children.push({
			$$mdtype: 'Tag',
			name: 'div',
			attributes: { class: 'rf-plan-sidebar__group', 'data-type': group.type },
			children: groupChildren,
		} as unknown as RendererNode);
	}

	// Views section
	if (viewDefs && viewDefs.length > 0) {
		const viewChildren: RendererNode[] = [];
		viewChildren.push({
			$$mdtype: 'Tag',
			name: 'div',
			attributes: { class: 'rf-plan-sidebar__group-title' },
			children: ['Views'],
		} as unknown as RendererNode);

		// Group view defs by field type
		const VIEW_FIELD_LABELS: Record<string, string> = { tag: 'By Tag', assignee: 'By Assignee', milestone: 'By Milestone' };
		const byField = new Map<string, ViewPageDef[]>();
		for (const v of viewDefs) {
			if (!byField.has(v.field)) byField.set(v.field, []);
			byField.get(v.field)!.push(v);
		}

		for (const [field, defs] of byField) {
			const subChildren: RendererNode[] = [];

			subChildren.push({
				$$mdtype: 'Tag',
				name: 'div',
				attributes: { class: 'rf-plan-sidebar__view-header' },
				children: [VIEW_FIELD_LABELS[field] || field],
			} as unknown as RendererNode);

			const linkNodes: RendererNode[] = defs.map(v => ({
				$$mdtype: 'Tag',
				name: 'a',
				attributes: {
					class: `rf-plan-sidebar__link${v.url === activeUrl ? ' rf-plan-sidebar__link--active' : ''}`,
					href: v.url,
				},
				children: [
					{
						$$mdtype: 'Tag',
						name: 'span',
						attributes: { class: 'rf-plan-sidebar__view-label' },
						children: [v.value],
					} as unknown as RendererNode,
					{
						$$mdtype: 'Tag',
						name: 'span',
						attributes: { class: 'rf-plan-sidebar__view-count' },
						children: [String(v.count)],
					} as unknown as RendererNode,
				],
			} as unknown as RendererNode));

			subChildren.push({
				$$mdtype: 'Tag',
				name: 'div',
				attributes: { class: 'rf-plan-sidebar__view-items' },
				children: linkNodes,
			} as unknown as RendererNode);

			viewChildren.push({
				$$mdtype: 'Tag',
				name: 'div',
				attributes: { class: 'rf-plan-sidebar__view-group', 'data-field': field },
				children: subChildren,
			} as unknown as RendererNode);
		}

		children.push({
			$$mdtype: 'Tag',
			name: 'div',
			attributes: { class: 'rf-plan-sidebar__group', 'data-type': 'views' },
			children: viewChildren,
		} as unknown as RendererNode);
	}

	return children;
}

function slugify(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// --- Dashboard generation ---

function generateDashboardContent(entities: PlanEntity[]): string {
	const milestones = entities.filter(e => e.type === 'milestone');
	const activeMilestones = milestones.filter(m => m.attributes.status === 'active');
	const allMilestones = milestones.filter(m => m.attributes.status !== 'complete');
	const hasMultipleMilestones = allMilestones.length > 1;

	let md = '# Plan Dashboard\n\n';

	// Progress summary
	md += `{% plan-progress /%}\n\n`;

	// Recent activity (placed high for quick access)
	md += `## Recent Activity\n\n`;
	md += `{% plan-activity limit="10" /%}\n\n`;

	// Active milestone(s)
	for (const ms of activeMilestones) {
		md += `## Active Milestone\n\n`;
		md += `{% milestone name="${ms.attributes.name}" status="${ms.attributes.status}" target="${ms.attributes.target || ''}" %}\n`;
		md += `# ${ms.title || ms.attributes.name}\n`;
		md += `{% /milestone %}\n\n`;
	}

	// Blocked items callout
	const hasBlocked = entities.some(e =>
		(e.type === 'work' || e.type === 'bug') && e.attributes.status === 'blocked',
	);
	if (hasBlocked) {
		md += `## Blocked\n\n`;
		md += `{% backlog filter="status:blocked" sort="priority" /%}\n\n`;
	}

	// Per-milestone grouping or flat layout
	if (hasMultipleMilestones) {
		// Group work items by milestone
		for (const ms of allMilestones) {
			const name = ms.attributes.name;
			md += `## ${ms.title || name}\n\n`;
			md += `{% backlog filter="milestone:${name}" sort="priority" group="status" /%}\n\n`;
		}
		// Unassigned items (no milestone)
		md += `## Unassigned\n\n`;
		md += `{% backlog filter="milestone:" sort="priority" group="status" /%}\n\n`;
	} else {
		md += `## In Progress\n\n`;
		md += `{% backlog filter="status:in-progress" sort="priority" /%}\n\n`;

		md += `## Ready for Work\n\n`;
		md += `{% backlog filter="status:ready" sort="priority" /%}\n\n`;
	}

	md += `## Recent Decisions\n\n`;
	md += `{% decision-log sort="date" /%}\n\n`;

	return md;
}

// --- Status filter page generation ---

interface StatusFilterPageDef {
	url: string;
	title: string;
	content: string;
	type: string;
	status: string;
	count: number;
}

function generateStatusFilterPages(entities: PlanEntity[], baseUrl: string): StatusFilterPageDef[] {
	const pages: StatusFilterPageDef[] = [];

	// Group entities by type, then by status
	const byType = new Map<string, Map<string, PlanEntity[]>>();
	for (const entity of entities) {
		const type = entity.type;
		if (!byType.has(type)) byType.set(type, new Map());
		const byStatus = byType.get(type)!;
		const status = entity.attributes.status || 'unknown';
		if (!byStatus.has(status)) byStatus.set(status, []);
		byStatus.get(status)!.push(entity);
	}

	// Sort fields by type
	const SORT_FIELDS: Record<string, string> = {
		work: 'priority', bug: 'priority',
		spec: 'id', decision: 'id', milestone: 'id',
	};

	// Show attribute — work/bug use "all" (to include both), others filter to their own type
	const SHOW_ATTRS: Record<string, string> = {
		work: ' show="all"', bug: ' show="all"',
		spec: ' show="spec"', decision: ' show="decision"', milestone: ' show="milestone"',
	};

	for (const [type, byStatus] of byType) {
		const statusOrder = STATUS_ORDER_BY_TYPE[type] ?? [];
		const sortedStatuses = [...byStatus.keys()].sort((a, b) => {
			const ai = statusOrder.indexOf(a);
			const bi = statusOrder.indexOf(b);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});

		for (const status of sortedStatuses) {
			const items = byStatus.get(status)!;
			const label = STATUS_LABELS_DISPLAY[status] || status;
			const sort = SORT_FIELDS[type] || 'priority';
			const show = SHOW_ATTRS[type] || '';
			const slug = slugify(status);
			pages.push({
				url: `${baseUrl}${type}/${slug}.html`,
				title: `${label} ${NAV_TITLES[type] || type}`,
				type,
				status,
				count: items.length,
				content: `# ${label}\n\n{% backlog filter="status:${status}" sort="${sort}"${show} /%}\n`,
			});
		}
	}

	return pages;
}

// --- View page generation ---

interface ViewPageDef {
	url: string;
	title: string;
	content: string;
	field: string;
	value: string;
	count: number;
}

function generateViewPages(entities: PlanEntity[], baseUrl: string): ViewPageDef[] {
	const views: ViewPageDef[] = [];

	// Collect distinct values for tags, assignees, milestones
	const tagCounts = new Map<string, number>();
	const assigneeCounts = new Map<string, number>();
	const milestoneCounts = new Map<string, number>();

	for (const entity of entities) {
		// Tags (comma-separated)
		const tags = entity.attributes.tags;
		if (tags) {
			for (const tag of tags.split(',').map(t => t.trim()).filter(Boolean)) {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			}
		}
		// Assignee
		const assignee = entity.attributes.assignee;
		if (assignee) {
			assigneeCounts.set(assignee, (assigneeCounts.get(assignee) ?? 0) + 1);
		}
		// Milestone
		if (entity.type === 'work' || entity.type === 'bug') {
			const milestone = entity.attributes.milestone;
			if (milestone) {
				milestoneCounts.set(milestone, (milestoneCounts.get(milestone) ?? 0) + 1);
			}
		}
	}

	// Generate tag view pages (threshold: 3+ distinct tags)
	if (tagCounts.size >= 3) {
		for (const [tag, count] of [...tagCounts.entries()].sort((a, b) => b[1] - a[1])) {
			const slug = slugify(tag);
			views.push({
				url: `${baseUrl}view/tag/${slug}.html`,
				title: `Tag: ${tag}`,
				field: 'tag',
				value: tag,
				count,
				content: `# Tag: ${tag}\n\nAll items tagged **${tag}** (${count}).\n\n{% backlog filter="tags:${tag}" sort="priority" group="status" /%}\n`,
			});
		}
	}

	// Generate assignee view pages (threshold: 2+ distinct assignees)
	if (assigneeCounts.size >= 2) {
		for (const [assignee, count] of [...assigneeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
			const slug = slugify(assignee);
			views.push({
				url: `${baseUrl}view/assignee/${slug}.html`,
				title: `Assignee: ${assignee}`,
				field: 'assignee',
				value: assignee,
				count,
				content: `# Assignee: ${assignee}\n\nAll items assigned to **${assignee}** (${count}).\n\n{% backlog filter="assignee:${assignee}" sort="priority" group="status" /%}\n`,
			});
		}
	}

	// Generate milestone view pages (threshold: 2+ milestones)
	if (milestoneCounts.size >= 2) {
		for (const [milestone, count] of [...milestoneCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
			const slug = slugify(milestone);
			views.push({
				url: `${baseUrl}view/milestone/${slug}.html`,
				title: `Milestone: ${milestone}`,
				field: 'milestone',
				value: milestone,
				count,
				content: `# Milestone: ${milestone}\n\nAll items in milestone **${milestone}** (${count}).\n\n{% backlog filter="milestone:${milestone}" sort="priority" group="status" /%}\n`,
			});
		}
	}

	return views;
}

const SIDEBAR_BEHAVIOR_SCRIPT = `<script>
(function() {
  var STORAGE_KEY = 'plan-sidebar-collapse';

  // --- Collapse toggling ---
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  var state = loadState();
  var headers = document.querySelectorAll('.rf-plan-sidebar__status-header');

  headers.forEach(function(btn) {
    var group = btn.closest('.rf-plan-sidebar__status-group');
    if (!group) return;
    var type = group.closest('.rf-plan-sidebar__group');
    var typeKey = type ? type.getAttribute('data-type') : '';
    var status = group.getAttribute('data-status');
    var key = typeKey + ':' + status;
    var items = group.querySelector('.rf-plan-sidebar__status-items');
    if (!items) return;

    // Restore saved state (overrides server default)
    if (key in state) {
      if (state[key]) {
        items.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        items.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    btn.addEventListener('click', function() {
      var isHidden = items.hasAttribute('hidden');
      if (isHidden) {
        items.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
        state[key] = false;
      } else {
        items.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
        state[key] = true;
      }
      saveState(state);
    });
  });

  // --- Keyboard navigation ---
  var focusIndex = -1;

  function getVisibleLinks() {
    return Array.from(document.querySelectorAll('.rf-plan-sidebar__link')).filter(function(el) {
      return el.offsetParent !== null && el.style.display !== 'none' && !el.closest('[hidden]');
    });
  }

  function getGroupHeaders() {
    return Array.from(document.querySelectorAll('.rf-plan-sidebar__status-header')).filter(function(el) {
      return el.offsetParent !== null;
    });
  }

  function setFocus(links, idx) {
    // Clear previous
    var prev = document.querySelector('.rf-plan-sidebar__link--focused');
    if (prev) prev.classList.remove('rf-plan-sidebar__link--focused');
    focusIndex = idx;
    if (idx >= 0 && idx < links.length) {
      links[idx].classList.add('rf-plan-sidebar__link--focused');
      links[idx].scrollIntoView({ block: 'nearest' });
    }
  }

  document.addEventListener('keydown', function(e) {
    // Don't intercept when typing in inputs (except Escape handled above)
    var tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    var links = getVisibleLinks();

    if (e.key === 'j') {
      e.preventDefault();
      var next = focusIndex + 1;
      if (next >= links.length) next = 0;
      setFocus(links, next);
    } else if (e.key === 'k') {
      e.preventDefault();
      var prev = focusIndex - 1;
      if (prev < 0) prev = links.length - 1;
      setFocus(links, prev);
    } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < links.length) {
      e.preventDefault();
      links[focusIndex].click();
    } else if (e.key === ']') {
      e.preventDefault();
      var headers = getGroupHeaders();
      if (headers.length === 0) return;
      // Find current group
      var currentLink = focusIndex >= 0 && focusIndex < links.length ? links[focusIndex] : null;
      var currentGroup = currentLink ? currentLink.closest('.rf-plan-sidebar__status-group') : null;
      var currentHeader = currentGroup ? currentGroup.querySelector('.rf-plan-sidebar__status-header') : null;
      var hi = currentHeader ? headers.indexOf(currentHeader) : -1;
      var nextHi = hi + 1 < headers.length ? hi + 1 : 0;
      // Find first visible link in that group
      var targetGroup = headers[nextHi].closest('.rf-plan-sidebar__status-group');
      var targetItems = targetGroup ? targetGroup.querySelector('.rf-plan-sidebar__status-items') : null;
      if (targetItems && targetItems.hasAttribute('hidden')) {
        // Expand the group first
        targetItems.removeAttribute('hidden');
        headers[nextHi].setAttribute('aria-expanded', 'true');
      }
      var firstLink = targetGroup ? targetGroup.querySelector('.rf-plan-sidebar__link') : null;
      if (firstLink) {
        var li = links.indexOf(firstLink);
        if (li === -1) { links = getVisibleLinks(); li = links.indexOf(firstLink); }
        setFocus(links, li >= 0 ? li : 0);
      }
    } else if (e.key === '[') {
      e.preventDefault();
      var headers2 = getGroupHeaders();
      if (headers2.length === 0) return;
      var currentLink2 = focusIndex >= 0 && focusIndex < links.length ? links[focusIndex] : null;
      var currentGroup2 = currentLink2 ? currentLink2.closest('.rf-plan-sidebar__status-group') : null;
      var currentHeader2 = currentGroup2 ? currentGroup2.querySelector('.rf-plan-sidebar__status-header') : null;
      var hi2 = currentHeader2 ? headers2.indexOf(currentHeader2) : headers2.length;
      var prevHi = hi2 - 1 >= 0 ? hi2 - 1 : headers2.length - 1;
      var targetGroup2 = headers2[prevHi].closest('.rf-plan-sidebar__status-group');
      var targetItems2 = targetGroup2 ? targetGroup2.querySelector('.rf-plan-sidebar__status-items') : null;
      if (targetItems2 && targetItems2.hasAttribute('hidden')) {
        targetItems2.removeAttribute('hidden');
        headers2[prevHi].setAttribute('aria-expanded', 'true');
      }
      var firstLink2 = targetGroup2 ? targetGroup2.querySelector('.rf-plan-sidebar__link') : null;
      if (firstLink2) {
        var li2 = links.indexOf(firstLink2);
        if (li2 === -1) { links = getVisibleLinks(); li2 = links.indexOf(firstLink2); }
        setFocus(links, li2 >= 0 ? li2 : 0);
      }
    } else if (e.key === 'o') {
      e.preventDefault();
      var currentLink3 = focusIndex >= 0 && focusIndex < links.length ? links[focusIndex] : null;
      var sg = currentLink3 ? currentLink3.closest('.rf-plan-sidebar__status-group') : null;
      if (!sg) return;
      var btn = sg.querySelector('.rf-plan-sidebar__status-header');
      if (btn) btn.click();
    }
  });
})();
</script>`;

// --- HtmlTheme for the plan site ---

const planTheme: HtmlTheme = {
	manifest: {
		name: 'plan',
		version: '0.0.0',
		target: 'html',
		designTokens: '',
		layouts: {},
		components: {},
		routeRules: [{ pattern: '**', layout: 'plan' }],
	},
	layouts: {
		plan: planLayout,
	},
};

// --- Main pipeline ---

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
	const { dir, specsDir, theme, baseUrl } = options;
	const ctx: PipelineContext = {
		info: () => {},
		warn: (msg: string) => { console.warn(`[plan] warn: ${msg}`); },
		error: (msg: string) => { console.error(`[plan] error: ${msg}`); },
	};

	// 1. Scan plan files
	const entities = scanPlanFiles(dir);
	let specsEntities: PlanEntity[] = [];
	if (specsDir && specsDir !== dir && fs.existsSync(specsDir)) {
		specsEntities = scanPlanFiles(specsDir);
	}
	const allEntities = [...entities, ...specsEntities];

	// Batch-collect git timestamps for the plan directory (and specs dir if separate)
	const gitTimestamps = getGitTimestamps(dir);
	const specsGitTimestamps = specsDir && specsDir !== dir ? getGitTimestamps(specsDir) : gitTimestamps;

	// 2. Parse and transform each entity file
	const transformedPages: TransformedPage[] = [];
	const pageMap = new Map<string, { entity: PlanEntity; page: TransformedPage }>();

	for (const entity of allEntities) {
		const filePath = path.resolve(dir, entity.file);
		const content = fs.readFileSync(filePath, 'utf-8');
		const url = `${baseUrl}${entity.type}/${slugify(entity.attributes.id || entity.attributes.name || '')}.html`;
		const tsMap = specsEntities.includes(entity) ? specsGitTimestamps : gitTimestamps;
		const ts = tsMap.get(entity.file) ?? getStatTimestamps(filePath);
		const { renderable, title, headings } = parseAndTransform(content, entity.file, ts);

		const page: TransformedPage = {
			url,
			title: title || entity.title || '',
			headings,
			frontmatter: {},
			renderable,
		};
		transformedPages.push(page);
		pageMap.set(url, { entity, page });
	}

	// 3. Check for user dashboard or generate one
	const indexPath = path.join(dir, 'index.md');
	const hasIndex = fs.existsSync(indexPath);
	let dashboardContent: string;
	if (hasIndex) {
		dashboardContent = fs.readFileSync(indexPath, 'utf-8');
	} else {
		dashboardContent = generateDashboardContent(allEntities);
	}
	const dashboardUrl = `${baseUrl}index.html`;
	const { renderable: dashRenderable, title: dashTitle } = parseAndTransform(dashboardContent, 'index.md');
	const dashboardPage: TransformedPage = {
		url: dashboardUrl,
		title: dashTitle || 'Plan Dashboard',
		headings: [],
		frontmatter: {},
		renderable: dashRenderable,
	};
	transformedPages.push(dashboardPage);

	// 3b. Generate status filter pages
	const statusFilterPages = generateStatusFilterPages(allEntities, baseUrl);
	const statusFilterMap = new Map(statusFilterPages.map(p => [p.url, p]));
	for (const sfp of statusFilterPages) {
		const { renderable: sfRenderable, title: sfTitle, headings: sfHeadings } = parseAndTransform(sfp.content, `${sfp.type}/${slugify(sfp.status)}.md`);
		const sfPage: TransformedPage = {
			url: sfp.url,
			title: sfTitle || sfp.title,
			headings: sfHeadings,
			frontmatter: {},
			renderable: sfRenderable,
		};
		transformedPages.push(sfPage);
	}

	// 3c. Generate view pages (by tag, assignee, milestone)
	const viewDefs = generateViewPages(allEntities, baseUrl);
	const viewDefMap = new Map(viewDefs.map(v => [v.url, v]));
	for (const viewDef of viewDefs) {
		const { renderable: viewRenderable, title: viewTitle, headings: viewHeadings } = parseAndTransform(viewDef.content, `view/${viewDef.field}/${slugify(viewDef.value)}.md`);
		const viewPage: TransformedPage = {
			url: viewDef.url,
			title: viewTitle || viewDef.title,
			headings: viewHeadings,
			frontmatter: {},
			renderable: viewRenderable,
		};
		transformedPages.push(viewPage);
	}

	// 4. Run pipeline hooks: register → aggregate → postProcess
	// Pass scanner dependency data (from ## Dependencies sections) to the pipeline
	const depMap = new Map<string, string[]>();
	for (const entity of allEntities) {
		const entityId = entity.attributes.id || entity.attributes.name;
		if (!entityId) continue;
		// Guard: scopedRefs may be absent on entities loaded from stale cache
		const scopedRefs = entity.scopedRefs ?? [];
		const depRefs = scopedRefs
			.filter(r => r.section === 'Dependencies')
			.map(r => r.id);
		if (depRefs.length > 0) depMap.set(entityId, depRefs);
	}
	setScannerDependencies(depMap);

	const { registry } = createRegistry();
	planPipelineHooks.register!(transformedPages, registry, ctx);

	const aggregated: Record<string, unknown> = {};
	const planAggregated = planPipelineHooks.aggregate!(registry, ctx) as Record<string, unknown>;

	// Inject mtime into entity data for activity tracking
	const mtimeMap = new Map<string, number>();
	for (const entity of allEntities) {
		const entityId = entity.attributes.id || entity.attributes.name;
		if (entityId && entity.mtime) {
			mtimeMap.set(entityId, entity.mtime);
		}
	}
	for (const key of ['workEntities', 'bugEntities', 'decisionEntities', 'specEntities'] as const) {
		const entities = planAggregated[key] as Array<{ id: string; data: Record<string, unknown> }> | undefined;
		if (!entities) continue;
		for (const e of entities) {
			const mtime = mtimeMap.get(e.id);
			if (mtime) e.data.mtime = mtime;
		}
	}

	aggregated['plan'] = planAggregated;

	const postProcessedPages = transformedPages.map(p =>
		planPipelineHooks.postProcess ? planPipelineHooks.postProcess(p, aggregated, ctx) : p,
	);

	// 4b. Resolve xref placeholders into clickable links
	const processedPages = postProcessedPages.map(p => {
		const resolved = resolveXrefs(p.renderable, p.url, registry, ctx);
		if (resolved === p.renderable) return p;
		return { ...p, renderable: resolved as typeof p.renderable };
	});

	// 5. Identity transform + syntax highlighting
	const themeConfig = buildThemeConfig();
	const identityTransform = createTransform(themeConfig);
	const themeCss = resolveThemeCss(theme);
	const nav = buildNavigation(allEntities, baseUrl);

	// Mark nav items with unresolved blockers
	const typedPlanData = planAggregated as unknown as PlanAggregatedData;
	const planRels = typedPlanData.relationships;
	if (planRels) {
		const RESOLVED_STATUSES = new Set(['done', 'fixed', 'accepted', 'complete', 'wontfix', 'duplicate', 'superseded', 'deprecated']);
		for (const group of nav) {
			for (const sg of group.statusGroups) {
				for (const item of sg.items) {
					const rels = planRels.get(item.id);
					if (!rels) continue;
					const blockedBy = rels.filter(r => r.kind === 'blocked-by' || r.kind === 'depends-on');
					if (blockedBy.length === 0) continue;
					// Check if any blocker is unresolved
					const hasUnresolved = blockedBy.some(r => {
						const allArrays = [
							typedPlanData.workEntities,
							typedPlanData.bugEntities,
							typedPlanData.decisionEntities,
							typedPlanData.specEntities,
						];
						for (const arr of allArrays) {
							const target = arr.find(e => e.id === r.toId);
							if (target) return !RESOLVED_STATUSES.has(String(target.data.status ?? ''));
						}
						return true; // Unknown target — treat as unresolved
					});
					if (hasUnresolved) item.hasUnresolvedBlockers = true;
				}
			}
		}
	}

	// Initialize syntax highlighting
	let highlightTransform: HighlightTransform | null = null;
	let highlightCss = '';
	try {
		highlightTransform = await createHighlightTransform();
		highlightCss = highlightTransform.css;
	} catch {
		// Highlight not available — render without syntax highlighting
	}

	const pages: ProcessedPage[] = [];
	let dashboardProcessed: ProcessedPage | undefined;

	for (const page of processedPages) {
		const serialized = serializeTree(page.renderable as any);
		let transformed = identityTransform(serialized as any);

		// Apply syntax highlighting
		if (highlightTransform) {
			transformed = highlightTransform(transformed) as typeof transformed;
		}

		const mapEntry = pageMap.get(page.url);
		const viewDef = viewDefMap.get(page.url);
		const statusFilterDef = statusFilterMap.get(page.url);

		const processed: ProcessedPage = {
			url: page.url,
			title: page.title,
			type: mapEntry?.entity.type ?? (statusFilterDef ? statusFilterDef.type : viewDef ? 'view' : 'dashboard'),
			entityId: mapEntry?.entity.attributes.id || mapEntry?.entity.attributes.name || '',
			status: mapEntry?.entity.attributes.status || (statusFilterDef?.status ?? ''),
			renderable: transformed as RendererNode,
			filePath: mapEntry?.entity.file ?? (statusFilterDef ? `${statusFilterDef.type}/${slugify(statusFilterDef.status)}.md` : viewDef ? `view/${viewDef.field}/${slugify(viewDef.value)}.md` : 'index.md'),
			headings: page.headings ?? [],
		};

		if (page.url === dashboardUrl) {
			dashboardProcessed = processed;
		} else {
			pages.push(processed);
		}
	}

	return {
		pages,
		dashboard: dashboardProcessed!,
		nav,
		navRegion: buildNavRegion(nav, baseUrl, undefined, viewDefs, statusFilterPages),
		themeCss,
		highlightCss,
	};
}

/**
 * Render a processed page to a full HTML document using the HTML adapter.
 */
export function renderPage(
	page: ProcessedPage,
	navRegion: RendererNode[],
	allPageUrls: Array<{ url: string; title: string; draft: boolean }>,
	opts?: { hotReload?: boolean; stylesheets?: string[]; scripts?: string[]; activeUrl?: string },
): string {
	const layoutPageData: LayoutPageData = {
		renderable: page.renderable,
		regions: {
			nav: {
				name: 'nav',
				mode: 'replace',
				content: navRegion,
			},
		},
		title: page.title,
		url: page.url,
		pages: allPageUrls,
		frontmatter: {
			toolbarTitle: page.entityId || 'Plan',
		},
		headings: page.headings,
	};

	const shellOptions: PageShellOptions = {
		stylesheets: opts?.stylesheets ?? [],
		scripts: opts?.scripts ?? [],
		bodyExtra: SIDEBAR_BEHAVIOR_SCRIPT,
	};

	// Hot reload SSE script
	if (opts?.hotReload) {
		const hotReloadScript = `<script>(function(){var es=new EventSource('/__plan-reload');es.onmessage=function(e){if(e.data==='reload')location.reload();};window.addEventListener('beforeunload',function(){es.close();});})()</script>`;
		shellOptions.headExtra = hotReloadScript;
	}

	return htmlRenderFullPage({ theme: planTheme, page: layoutPageData }, shellOptions);
}

export function getThemeCss(theme: string): string {
	return resolveThemeCss(theme);
}
