import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Markdoc from '@markdoc/markdoc';
import { tags as coreTags, nodes, extractHeadings, runeTagMap, defineRune, serializeTree, coreConfig } from '@refrakt-md/runes';
import { createTransform, renderToHtml, mergeThemeConfig, planLayout } from '@refrakt-md/transform';
import type { ThemeConfig, LayoutPageData } from '@refrakt-md/transform';
import type { RendererNode, SerializedTag, TransformedPage, EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { renderFullPage as htmlRenderFullPage } from '@refrakt-md/html';
import type { HtmlTheme, PageShellOptions } from '@refrakt-md/html';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { HighlightTransform } from '@refrakt-md/highlight';
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

export interface ProcessedPage {
	url: string;
	title: string;
	type: string;
	entityId: string;
	status: string;
	renderable: RendererNode;
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

	return inlineCssImports(fs.readFileSync(cssPath, 'utf-8'), path.dirname(cssPath));
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

/**
 * Convert NavGroup[] to a serialized tag tree for the layout's nav region.
 * Produces BEM-classed elements matching the existing .rf-plan-sidebar__* selectors.
 */
function buildNavRegion(groups: NavGroup[], baseUrl: string, activeUrl?: string): RendererNode[] {
	const children: RendererNode[] = [];

	// Title
	children.push({
		$$mdtype: 'Tag',
		name: 'div',
		attributes: { class: 'rf-plan-sidebar__title' },
		children: ['Plan'],
	} as unknown as RendererNode);

	// Dashboard link
	const dashActive = activeUrl === baseUrl || activeUrl === `${baseUrl}index.html`;
	children.push({
		$$mdtype: 'Tag',
		name: 'a',
		attributes: {
			class: `rf-plan-sidebar__link${dashActive ? ' rf-plan-sidebar__link--active' : ''}`,
			href: baseUrl,
		},
		children: ['Dashboard'],
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

		for (const item of group.items) {
			const isActive = item.url === activeUrl;
			groupChildren.push({
				$$mdtype: 'Tag',
				name: 'a',
				attributes: {
					class: `rf-plan-sidebar__link${isActive ? ' rf-plan-sidebar__link--active' : ''}`,
					href: item.url,
				},
				children: [item.label],
			} as unknown as RendererNode);
		}

		children.push({
			$$mdtype: 'Tag',
			name: 'div',
			attributes: { class: 'rf-plan-sidebar__group' },
			children: groupChildren,
		} as unknown as RendererNode);
	}

	return children;
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

// --- Copy-to-clipboard behavior (inline script) ---

const COPY_BUTTON_SCRIPT = `<script>
(function() {
  document.querySelectorAll('pre').forEach(function(pre) {
    var wrapper = document.createElement('div');
    wrapper.className = 'rf-code-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    var btn = document.createElement('button');
    btn.className = 'rf-copy-button';
    btn.setAttribute('aria-label', 'Copy code');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    btn.onclick = function() {
      var sel = pre.getAttribute('data-copy-selector');
      var text = sel ? (pre.querySelector(sel) || pre).textContent : pre.textContent;
      navigator.clipboard.writeText(text || '').then(function() {
        btn.classList.add('rf-copy-button--copied');
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(function() {
          btn.classList.remove('rf-copy-button--copied');
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 2000);
      });
    };
    wrapper.appendChild(btn);
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

	// 5. Identity transform + syntax highlighting
	const themeConfig = buildThemeConfig();
	const identityTransform = createTransform(themeConfig);
	const themeCss = resolveThemeCss(theme);
	const nav = buildNavigation(allEntities, baseUrl);

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

		const processed: ProcessedPage = {
			url: page.url,
			title: page.title,
			type: mapEntry?.entity.type ?? 'dashboard',
			entityId: mapEntry?.entity.attributes.id || mapEntry?.entity.attributes.name || '',
			status: mapEntry?.entity.attributes.status || '',
			renderable: transformed as RendererNode,
			filePath: mapEntry?.entity.file ?? 'index.md',
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
		navRegion: buildNavRegion(nav, baseUrl),
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
	opts?: { hotReload?: boolean; stylesheets?: string[]; activeUrl?: string },
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
		frontmatter: {},
		headings: [],
	};

	const shellOptions: PageShellOptions = {
		stylesheets: opts?.stylesheets ?? [],
	};

	// Hot reload SSE script
	if (opts?.hotReload) {
		const hotReloadScript = `<script>(function(){var es=new EventSource('/__plan-reload');es.onmessage=function(e){if(e.data==='reload')location.reload();};})()</script>`;
		shellOptions.headExtra = hotReloadScript;
	}

	let html = htmlRenderFullPage({ theme: planTheme, page: layoutPageData }, shellOptions);

	// Inject copy-to-clipboard behavior before </body>
	html = html.replace('</body>', COPY_BUTTON_SCRIPT + '\n</body>');

	return html;
}

export function getThemeCss(theme: string): string {
	return resolveThemeCss(theme);
}
