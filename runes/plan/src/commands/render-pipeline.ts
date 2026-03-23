import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Markdoc from '@markdoc/markdoc';
import { tags as coreTags, nodes, extractHeadings, runeTagMap, defineRune, serializeTree, coreConfig } from '@refrakt-md/runes';
import { createTransform, renderToHtml, mergeThemeConfig } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { TransformedPage, EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { plan } from '../index.js';
import { planPipelineHooks, type PlanAggregatedData } from '../pipeline.js';
import { scanPlanFiles } from '../scanner.js';
import type { PlanEntity } from '../types.js';

// --- Markdoc tag registry (built once) ---

const packageRunes: Record<string, any> = {};
for (const [name, entry] of Object.entries(plan.runes)) {
	packageRunes[name] = defineRune({ name, schema: entry.transform as any, aliases: entry.aliases });
}
const tags = { ...coreTags, ...runeTagMap(packageRunes), ...Markdoc.tags };

// --- Types ---

export interface RenderedPage {
	url: string;
	title: string;
	type: string;
	entityId: string;
	status: string;
	html: string;
	filePath: string;
}

export interface NavGroup {
	title: string;
	items: NavItem[];
}

export interface NavItem {
	url: string;
	label: string;
	id: string;
	status: string;
}

export interface PipelineResult {
	pages: RenderedPage[];
	dashboard: RenderedPage;
	nav: NavGroup[];
}

export interface PipelineOptions {
	dir: string;
	specsDir?: string;
	theme: string;
	baseUrl: string;
}

// --- Theme resolution ---

function getLuminaBaseCss(): string {
	const luminaFiles = [
		'tokens/base.css',
		'styles/global.css',
		'styles/elements/blockquote.css',
		'styles/elements/table.css',
		'styles/base/attributes.css',
	];
	try {
		const luminaDir = path.dirname(fileURLToPath(import.meta.resolve('@refrakt-md/lumina/base.css')));
		return luminaFiles
			.map(f => {
				const filePath = path.join(luminaDir, f);
				return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
			})
			.join('\n');
	} catch {
		// @refrakt-md/lumina not available — skip base styles
		return '';
	}
}

function inlineCssImports(css: string, cssDir: string): string {
	return css.replace(/@import\s+['"]\.\/([^'"]+)['"]\s*;/g, (_match, file) => {
		const importPath = path.join(cssDir, file);
		if (fs.existsSync(importPath)) {
			return fs.readFileSync(importPath, 'utf-8');
		}
		return _match;
	});
}

function resolveThemeCss(theme: string): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const stylesDir = path.resolve(__dirname, '../../styles');

	let cssPath: string;
	if (theme === 'default') {
		cssPath = path.join(stylesDir, 'default.css');
	} else if (theme === 'minimal') {
		cssPath = path.join(stylesDir, 'minimal.css');
	} else if (fs.existsSync(theme)) {
		cssPath = theme;
	} else {
		throw new Error(`Theme not found: "${theme}". Use "default", "minimal", or a path to a CSS file.`);
	}

	const baseCss = getLuminaBaseCss();
	const themeCss = inlineCssImports(fs.readFileSync(cssPath, 'utf-8'), path.dirname(cssPath));
	return baseCss + '\n' + themeCss;
}

function buildThemeConfig(): ThemeConfig {
	const planRuneConfigs = plan.theme?.runes ?? {};
	return mergeThemeConfig(coreConfig, { runes: planRuneConfigs as any });
}

// --- Markdoc rendering ---

function parseAndTransform(content: string, filePath: string): { renderable: unknown; title: string } {
	const ast = Markdoc.parse(content);
	const headings = extractHeadings(ast);
	const config = {
		tags,
		nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: filePath,
			headings,
			__source: content,
		},
	};
	const renderable = Markdoc.transform(ast, config);
	const title = headings.length > 0 ? headings[0].text : '';
	return { renderable, title };
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
			byTypeAndId.get(entry.type)!.set(entry.id, entry);
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
		});
	}

	return [...groups.entries()]
		.sort(([a], [b]) => (NAV_ORDER[a] ?? 99) - (NAV_ORDER[b] ?? 99))
		.map(([type, items]) => ({
			title: NAV_TITLES[type] || type,
			items: items.sort((a, b) => a.id.localeCompare(b.id)),
		}));
}

function slugify(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// --- Dashboard generation ---

function generateDashboardContent(entities: PlanEntity[]): string {
	const milestones = entities.filter(e => e.type === 'milestone' && e.attributes.status === 'active');
	const activeMilestone = milestones[0];

	let md = '# Plan Dashboard\n\n';

	if (activeMilestone) {
		md += `## Active Milestone\n\n`;
		md += `{% milestone name="${activeMilestone.attributes.name}" status="${activeMilestone.attributes.status}" target="${activeMilestone.attributes.target || ''}" %}\n`;
		md += `# ${activeMilestone.title || activeMilestone.attributes.name}\n`;
		md += `{% /milestone %}\n\n`;
	}

	md += `## Ready for Work\n\n`;
	md += `{% backlog filter="status:ready" sort="priority" /%}\n\n`;

	md += `## In Progress\n\n`;
	md += `{% backlog filter="status:in-progress" sort="priority" /%}\n\n`;

	md += `## Recent Decisions\n\n`;
	md += `{% decision-log sort="date" /%}\n`;

	return md;
}

// --- HTML shell template ---

function htmlShell(opts: {
	title: string;
	content: string;
	css: string;
	nav: NavGroup[];
	baseUrl: string;
	activeUrl?: string;
}): string {
	const navHtml = renderNav(opts.nav, opts.activeUrl);
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>${opts.css}</style>
</head>
<body>
<nav class="rf-plan-sidebar">
<div class="rf-plan-sidebar__title">Plan</div>
<a class="rf-plan-sidebar__link${opts.activeUrl === opts.baseUrl ? ' rf-plan-sidebar__link--active' : ''}" href="${opts.baseUrl}">Dashboard</a>
${navHtml}
</nav>
<main class="rf-plan-main">
${opts.content}
</main>
</body>
</html>`;
}

function renderNav(groups: NavGroup[], activeUrl?: string): string {
	return groups.map(g => {
		const items = g.items.map(item => {
			const active = item.url === activeUrl ? ' rf-plan-sidebar__link--active' : '';
			return `<a class="rf-plan-sidebar__link${active}" href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a>`;
		}).join('\n');
		return `<div class="rf-plan-sidebar__group">
<div class="rf-plan-sidebar__group-title">${escapeHtml(g.title)}</div>
${items}
</div>`;
	}).join('\n');
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Hot reload script ---

const HOT_RELOAD_SCRIPT = `<script>
(function() {
  var es = new EventSource('/__plan-reload');
  es.onmessage = function(e) { if (e.data === 'reload') location.reload(); };
})();
</script>`;

// --- Main pipeline ---

export function runPipeline(options: PipelineOptions): PipelineResult {
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

	// 2. Parse and transform each entity file
	const transformedPages: TransformedPage[] = [];
	const pageMap = new Map<string, { entity: PlanEntity; page: TransformedPage }>();

	for (const entity of allEntities) {
		const filePath = path.resolve(dir, entity.file);
		const content = fs.readFileSync(filePath, 'utf-8');
		const url = `${baseUrl}${entity.type}/${slugify(entity.attributes.id || entity.attributes.name || '')}.html`;
		const { renderable, title } = parseAndTransform(content, entity.file);

		const page: TransformedPage = {
			url,
			title: title || entity.title || '',
			headings: [],
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

	// 4. Run pipeline hooks: register → aggregate → postProcess
	const { registry } = createRegistry();
	planPipelineHooks.register!(transformedPages, registry, ctx);

	const aggregated: Record<string, unknown> = {};
	aggregated['plan'] = planPipelineHooks.aggregate!(registry, ctx);

	const processedPages = transformedPages.map(p =>
		planPipelineHooks.postProcess ? planPipelineHooks.postProcess(p, aggregated, ctx) : p,
	);

	// 5. Identity transform + HTML render
	const themeConfig = buildThemeConfig();
	const identityTransform = createTransform(themeConfig);
	const themeCss = resolveThemeCss(theme);
	const nav = buildNavigation(allEntities, baseUrl);

	const renderedPages: RenderedPage[] = [];
	let dashboardRendered: RenderedPage | undefined;

	for (const page of processedPages) {
		const serialized = serializeTree(page.renderable as any);
		const transformed = identityTransform(serialized as any);
		const contentHtml = renderToHtml(transformed);

		const mapEntry = pageMap.get(page.url);

		const rendered: RenderedPage = {
			url: page.url,
			title: page.title,
			type: mapEntry?.entity.type ?? 'dashboard',
			entityId: mapEntry?.entity.attributes.id || mapEntry?.entity.attributes.name || '',
			status: mapEntry?.entity.attributes.status || '',
			html: contentHtml,
			filePath: mapEntry?.entity.file ?? 'index.md',
		};

		if (page.url === dashboardUrl) {
			dashboardRendered = rendered;
		} else {
			renderedPages.push(rendered);
		}
	}

	return {
		pages: renderedPages,
		dashboard: dashboardRendered!,
		nav,
	};
}

export function renderFullPage(
	page: RenderedPage,
	css: string,
	nav: NavGroup[],
	baseUrl: string,
	opts?: { hotReload?: boolean },
): string {
	let content = page.html;
	if (opts?.hotReload) {
		content += HOT_RELOAD_SCRIPT;
	}
	return htmlShell({
		title: page.title || 'Plan',
		content,
		css,
		nav,
		baseUrl,
		activeUrl: page.url,
	});
}

export function getThemeCss(theme: string): string {
	return resolveThemeCss(theme);
}
