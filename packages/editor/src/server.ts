import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, statSync, renameSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { join, resolve, normalize, extname, relative } from 'node:path';
import { exec } from 'node:child_process';
import { ContentTree } from '@refrakt-md/content';
import { parseFrontmatter, serializeFrontmatter } from '@refrakt-md/content';
import { runes as allRunes } from '@refrakt-md/runes';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
import { createTransform } from '@refrakt-md/transform';
import { bundleCss } from './css.js';
import { renderPreviewPage, renderPreviewContent } from './preview.js';
import { createHighlightTransform } from '@refrakt-md/highlight';
import { buildPreviewRuntime } from './preview-builder.js';
import { LayoutResolver } from './layout-resolver.js';

export interface EditorOptions {
	/** Absolute path to the content directory */
	contentDir: string;
	/** Port to listen on (default: 4800) */
	port?: number;
	/** Theme configuration object */
	themeConfig: ThemeConfig;
	/** Path to theme's CSS entry file (index.css) */
	themeCssPath?: string;
	/** Path to theme's Svelte entry (for preview runtime) */
	themeSveltePath?: string;
	/** URL of running dev server for live preview */
	devServer?: string;
	/** Whether to open browser automatically (default: true) */
	open?: boolean;
}

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

/**
 * Resolve the path to the built frontend (app/dist).
 * Works from both the compiled dist/ directory and the source src/ directory.
 */
function resolveAppDist(): string {
	// import.meta.dirname gives us the directory of THIS file.
	// In compiled form: packages/editor/dist/
	// We need:          packages/editor/app/dist/
	const thisDir = import.meta.dirname;
	const appDist = resolve(thisDir, '..', 'app', 'dist');
	return appDist;
}

export async function startEditor(options: EditorOptions): Promise<void> {
	const {
		contentDir,
		port = 4800,
		themeConfig,
		themeCssPath,
		themeSveltePath,
		devServer,
		open = true,
	} = options;

	const absContentDir = resolve(contentDir);
	const appDistDir = resolveAppDist();

	// Bundle theme CSS once on startup
	let themeCss = '';
	if (themeCssPath && existsSync(themeCssPath)) {
		themeCss = bundleCss(themeCssPath);
	}

	// Initialize syntax highlighting (Shiki)
	const highlightTransform = await createHighlightTransform();
	if (highlightTransform.css) {
		themeCss += '\n' + highlightTransform.css;
	}

	// Build Svelte preview runtime if theme has a Svelte entry
	let previewRuntimeDir: string | null = null;
	if (themeSveltePath) {
		const result = await buildPreviewRuntime(themeSveltePath);
		if (result.success) {
			previewRuntimeDir = result.outputDir;
			console.log('  Preview runtime: built \u2713');
		}
	}

	// Initialize layout resolver for full-page preview with layouts
	const layoutResolver = new LayoutResolver(absContentDir, themeConfig);
	await layoutResolver.refresh();

	// Create identity transform once (reused across preview requests)
	const identityTransform = createTransform(themeConfig);

	const server = createServer(async (req, res) => {
		try {
			const url = new URL(req.url!, `http://localhost:${port}`);
			const method = req.method ?? 'GET';

			// CORS headers for development
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

			if (method === 'OPTIONS') {
				res.writeHead(204);
				res.end();
				return;
			}

			// API routes
			if (method === 'GET' && url.pathname === '/api/tree') {
				await handleGetTree(res, absContentDir);
			} else if (method === 'GET' && url.pathname.startsWith('/api/files/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/files/'.length));
				handleGetFile(res, absContentDir, filePath);
			} else if (method === 'PUT' && url.pathname.startsWith('/api/files/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/files/'.length));
				await handlePutFile(req, res, absContentDir, filePath);
				// Refresh layout resolver so layout changes propagate to preview
				layoutResolver.refresh().catch(() => {});
			} else if (method === 'GET' && url.pathname.startsWith('/api/preview/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/preview/'.length));
				handlePreview(res, absContentDir, filePath, themeConfig, themeCss, highlightTransform);
			} else if (method === 'POST' && url.pathname === '/api/preview') {
				await handlePreviewContent(req, res, themeConfig, themeCss, highlightTransform);
			} else if (method === 'POST' && url.pathname === '/api/pages') {
				await handleCreatePage(req, res, absContentDir);
			} else if (method === 'POST' && url.pathname === '/api/directories') {
				await handleCreateDirectory(req, res, absContentDir);
			} else if (method === 'POST' && url.pathname === '/api/rename') {
				await handleRename(req, res, absContentDir);
			} else if (method === 'POST' && url.pathname === '/api/duplicate') {
				await handleDuplicate(req, res, absContentDir);
			} else if (method === 'DELETE' && url.pathname.startsWith('/api/files/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/files/'.length));
				handleDelete(res, absContentDir, filePath);
			} else if (method === 'POST' && url.pathname === '/api/toggle-draft') {
				await handleToggleDraft(req, res, absContentDir);
			} else if (method === 'GET' && url.pathname === '/api/pages-list') {
				await handlePagesList(res, absContentDir);
			} else if (method === 'GET' && url.pathname === '/api/runes') {
				handleGetRunes(res);
			} else if (method === 'GET' && url.pathname === '/api/config') {
				serveJson(res, {
					previewRuntime: previewRuntimeDir !== null,
					devServerUrl: devServer ?? null,
				});
			} else if (method === 'POST' && url.pathname === '/api/preview-data') {
				await handlePreviewData(req, res, layoutResolver, identityTransform, highlightTransform);
			} else if (previewRuntimeDir && method === 'GET' && url.pathname === '/preview/theme.css') {
				res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
				res.end(themeCss);
			} else if (previewRuntimeDir && method === 'GET' && url.pathname.startsWith('/preview/')) {
				const file = url.pathname.slice('/preview/'.length) || 'index.html';
				serveStatic(res, previewRuntimeDir, '/' + file);
			} else if (method === 'GET') {
				// Serve static frontend (SPA fallback to index.html)
				serveStatic(res, appDistDir, url.pathname);
			} else {
				res.writeHead(404, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Not Found' }));
			}
		} catch (err) {
			console.error('Server error:', err);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Internal Server Error' }));
		}
	});

	server.listen(port, '127.0.0.1', () => {
		const url = `http://localhost:${port}`;
		console.log(`\n  refrakt editor running at ${url}\n`);
		console.log(`  Content directory: ${absContentDir}`);
		if (devServer) console.log(`  Dev server: ${devServer}`);
		console.log('');

		if (open) {
			const cmd = process.platform === 'darwin'
				? 'open'
				: process.platform === 'win32'
					? 'start'
					: 'xdg-open';
			exec(`${cmd} ${url}`);
		}
	});
}

// ── Static file serving ──────────────────────────────────────────────────

function serveStatic(
	res: import('node:http').ServerResponse,
	appDistDir: string,
	pathname: string,
): void {
	// Try exact file first, then fall back to index.html (SPA routing)
	let filePath = join(appDistDir, pathname === '/' ? 'index.html' : pathname);

	if (!existsSync(filePath) || !filePath.startsWith(appDistDir)) {
		// SPA fallback
		filePath = join(appDistDir, 'index.html');
	}

	if (!existsSync(filePath)) {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Editor frontend not built. Run: npm run build -w packages/editor');
		return;
	}

	const ext = extname(filePath);
	const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
	const content = readFileSync(filePath);
	res.writeHead(200, { 'Content-Type': contentType });
	res.end(content);
}

// ── Route handlers ──────────────────────────────────────────────────────

async function handleGetTree(res: import('node:http').ServerResponse, contentDir: string): Promise<void> {
	const tree = await ContentTree.fromDirectory(contentDir);
	serveJson(res, directoryToJson(tree.root, contentDir));
}

function handleGetFile(
	res: import('node:http').ServerResponse,
	contentDir: string,
	filePath: string,
): void {
	const fullPath = safePath(contentDir, filePath);
	if (!fullPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	if (!existsSync(fullPath)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'File not found' }));
		return;
	}

	const raw = readFileSync(fullPath, 'utf-8');
	const { frontmatter, content } = parseFrontmatter(raw);
	serveJson(res, { path: filePath, frontmatter, content, raw });
}

async function handlePutFile(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
	filePath: string,
): Promise<void> {
	const fullPath = safePath(contentDir, filePath);
	if (!fullPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	const body = await readBody(req);
	const { content } = JSON.parse(body) as { content: string };

	writeFileSync(fullPath, content, 'utf-8');

	serveJson(res, { ok: true, path: filePath });
}

function handlePreview(
	res: import('node:http').ServerResponse,
	contentDir: string,
	filePath: string,
	themeConfig: ThemeConfig,
	themeCss: string,
	highlight: (tree: import('@refrakt-md/transform').RendererNode) => import('@refrakt-md/transform').RendererNode,
): void {
	const fullPath = safePath(contentDir, filePath);
	if (!fullPath) {
		res.writeHead(403, { 'Content-Type': 'text/plain' });
		res.end('Forbidden');
		return;
	}

	if (!existsSync(fullPath)) {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('File not found');
		return;
	}

	const html = renderPreviewPage(contentDir, filePath, themeConfig, themeCss, highlight);
	serveHtml(res, html);
}

async function handlePreviewContent(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	themeConfig: ThemeConfig,
	themeCss: string,
	highlight: (tree: import('@refrakt-md/transform').RendererNode) => import('@refrakt-md/transform').RendererNode,
): Promise<void> {
	const body = await readBody(req);
	const { content } = JSON.parse(body) as { content: string };

	const html = renderPreviewContent(content, themeConfig, themeCss, highlight);
	serveHtml(res, html);
}

async function handlePreviewData(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	resolver: LayoutResolver,
	transform: (tree: RendererNode) => RendererNode,
	highlight: (tree: RendererNode) => RendererNode,
): Promise<void> {
	const body = await readBody(req);
	const { path, content } = JSON.parse(body) as { path: string; content: string };

	const isLayout = path.endsWith('_layout.md');
	const data = isLayout
		? resolver.buildLayoutPreviewData(path, content, transform, highlight)
		: resolver.buildPreviewData(path, content, transform, highlight);

	serveJson(res, data);
}

// ── File operation handlers ──────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

const PAGE_TEMPLATES: Record<string, (title: string) => Record<string, unknown>> = {
	blank: (title) => ({ title }),
	blog: (title) => ({ title, date: new Date().toISOString().slice(0, 10), tags: [] }),
	docs: (title) => ({ title, order: 0 }),
};

async function handleCreatePage(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
): Promise<void> {
	const body = await readBody(req);
	const { directory = '', slug, title, template = 'blank', draft } = JSON.parse(body) as {
		directory?: string; slug: string; title: string; template?: string; draft?: boolean;
	};

	if (!slug || !SLUG_RE.test(slug)) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Invalid slug. Use lowercase alphanumeric and hyphens.' }));
		return;
	}

	const dirPath = safePath(contentDir, directory);
	if (!dirPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	const fileName = `${slug}.md`;
	const fullPath = join(dirPath, fileName);

	if (existsSync(fullPath)) {
		res.writeHead(409, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'File already exists' }));
		return;
	}

	const templateFn = PAGE_TEMPLATES[template] ?? PAGE_TEMPLATES.blank;
	const fm: Record<string, unknown> = templateFn(title);
	if (draft) fm.draft = true;

	const content = serializeFrontmatter(fm, '\n');
	writeFileSync(fullPath, content, 'utf-8');

	const relativePath = directory ? `${directory}/${fileName}` : fileName;
	serveJson(res, { ok: true, path: relativePath });
}

async function handleCreateDirectory(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
): Promise<void> {
	const body = await readBody(req);
	const { parent = '', name, createLayout } = JSON.parse(body) as {
		parent?: string; name: string; createLayout?: boolean;
	};

	if (!name || !SLUG_RE.test(name)) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Invalid directory name. Use lowercase alphanumeric and hyphens.' }));
		return;
	}

	const parentPath = safePath(contentDir, parent);
	if (!parentPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	const dirPath = join(parentPath, name);

	if (existsSync(dirPath)) {
		res.writeHead(409, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Directory already exists' }));
		return;
	}

	mkdirSync(dirPath, { recursive: true });

	if (createLayout) {
		const layoutContent = serializeFrontmatter({ title: name }, '\n');
		writeFileSync(join(dirPath, '_layout.md'), layoutContent, 'utf-8');
	}

	const relativePath = parent ? `${parent}/${name}` : name;
	serveJson(res, { ok: true, path: relativePath });
}

async function handleRename(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
): Promise<void> {
	const body = await readBody(req);
	const { oldPath, newName } = JSON.parse(body) as { oldPath: string; newName: string };

	const fullOld = safePath(contentDir, oldPath);
	if (!fullOld) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	if (!existsSync(fullOld)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'File not found' }));
		return;
	}

	const dir = dirname(fullOld);
	const fullNew = join(dir, newName);

	if (!fullNew.startsWith(contentDir)) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	if (existsSync(fullNew)) {
		res.writeHead(409, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Target name already exists' }));
		return;
	}

	renameSync(fullOld, fullNew);

	const parentRelative = dirname(oldPath);
	const newPath = parentRelative === '.' ? newName : `${parentRelative}/${newName}`;
	serveJson(res, { ok: true, oldPath, newPath });
}

async function handleDuplicate(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
): Promise<void> {
	const body = await readBody(req);
	const { path: filePath } = JSON.parse(body) as { path: string };

	const fullPath = safePath(contentDir, filePath);
	if (!fullPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	if (!existsSync(fullPath)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'File not found' }));
		return;
	}

	const dir = dirname(fullPath);
	const name = basename(fullPath);
	const ext = extname(name);
	const base = name.slice(0, -ext.length);

	let copyName = `${base}-copy${ext}`;
	let counter = 2;
	while (existsSync(join(dir, copyName))) {
		copyName = `${base}-copy-${counter}${ext}`;
		counter++;
	}

	copyFileSync(fullPath, join(dir, copyName));

	const parentRelative = dirname(filePath);
	const newPath = parentRelative === '.' ? copyName : `${parentRelative}/${copyName}`;
	serveJson(res, { ok: true, path: newPath });
}

function handleDelete(
	res: import('node:http').ServerResponse,
	contentDir: string,
	filePath: string,
): void {
	const fullPath = safePath(contentDir, filePath);
	if (!fullPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	if (!existsSync(fullPath)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Not found' }));
		return;
	}

	const stat = statSync(fullPath);
	rmSync(fullPath, { recursive: stat.isDirectory() });
	serveJson(res, { ok: true });
}

async function handleToggleDraft(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
): Promise<void> {
	const body = await readBody(req);
	const { path: filePath } = JSON.parse(body) as { path: string };

	const fullPath = safePath(contentDir, filePath);
	if (!fullPath) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	if (!existsSync(fullPath)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'File not found' }));
		return;
	}

	const raw = readFileSync(fullPath, 'utf-8');
	const { frontmatter, content } = parseFrontmatter(raw);

	if (frontmatter.draft) {
		delete frontmatter.draft;
	} else {
		frontmatter.draft = true;
	}

	const newRaw = serializeFrontmatter(frontmatter, content);
	writeFileSync(fullPath, newRaw, 'utf-8');

	serveJson(res, { ok: true, draft: frontmatter.draft ?? false });
}

async function handlePagesList(
	res: import('node:http').ServerResponse,
	contentDir: string,
): Promise<void> {
	const tree = await ContentTree.fromDirectory(contentDir);
	const pages: { slug: string; path: string; title: string }[] = [];

	function walk(dir: import('@refrakt-md/content').ContentDirectory) {
		for (const page of dir.pages) {
			const name = page.relativePath.split('/').pop()!;
			const slug = name.replace(/\.md$/, '');
			const { frontmatter } = parseFrontmatter(page.raw);
			pages.push({
				slug,
				path: page.relativePath,
				title: (frontmatter.title as string) || slug,
			});
		}
		for (const child of dir.children) {
			walk(child);
		}
	}

	walk(tree.root);
	serveJson(res, { pages });
}

// ── Rune metadata ────────────────────────────────────────────────────────

const CHILD_RUNES = new Set([
	'tab', 'step', 'tier', 'accordion-item', 'timeline-entry', 'changelog-release',
	'cast-member', 'conversation-message', 'reveal-step', 'bento-cell',
	'storyboard-panel', 'note', 'form-field', 'comparison-column', 'comparison-row',
	'symbol-group', 'symbol-member', 'map-pin', 'definition', 'region',
]);

const RUNE_CATEGORIES: Record<string, string> = {
	hero: 'Section', cta: 'Section', feature: 'Section', pricing: 'Section',
	comparison: 'Section', testimonial: 'Section',

	hint: 'Content', steps: 'Content', sidenote: 'Content', figure: 'Content',
	details: 'Content', embed: 'Content', icon: 'Content', form: 'Content',

	grid: 'Layout', tabs: 'Layout', accordion: 'Layout', bento: 'Layout',
	reveal: 'Layout', annotate: 'Layout',

	codegroup: 'Code & Data', compare: 'Code & Data', diff: 'Code & Data',
	api: 'Code & Data', symbol: 'Code & Data', datatable: 'Code & Data',
	chart: 'Code & Data', diagram: 'Code & Data', preview: 'Code & Data',
	sandbox: 'Code & Data',

	recipe: 'Semantic', howto: 'Semantic', event: 'Semantic', cast: 'Semantic',
	organization: 'Semantic', timeline: 'Semantic', changelog: 'Semantic',
	conversation: 'Semantic', storyboard: 'Semantic', map: 'Semantic',
	'music-playlist': 'Semantic', 'music-recording': 'Semantic', error: 'Semantic',

	swatch: 'Design', palette: 'Design', typography: 'Design',
	spacing: 'Design', 'design-context': 'Design',

	nav: 'Site', layout: 'Site', toc: 'Site', breadcrumb: 'Site',
};

let cachedRuneData: unknown[] | null = null;

function handleGetRunes(res: import('node:http').ServerResponse): void {
	if (!cachedRuneData) {
		cachedRuneData = [];
		for (const rune of Object.values(allRunes)) {
			if (CHILD_RUNES.has(rune.name)) continue;

			const attrs: Record<string, { type: string; required: boolean; values?: string[] }> = {};
			if (rune.schema.attributes) {
				for (const [name, attr] of Object.entries(rune.schema.attributes)) {
					const typeName = typeof attr.type === 'function'
						? attr.type.name
						: Array.isArray(attr.type)
							? attr.type.map((t: unknown) => (t as { name?: string }).name ?? 'unknown').join(' | ')
							: 'String';
					attrs[name] = {
						type: typeName,
						required: attr.required ?? false,
						...(Array.isArray(attr.matches) ? { values: attr.matches.map(String) } : {}),
					};
				}
			}

			cachedRuneData.push({
				name: rune.name,
				aliases: rune.aliases,
				description: rune.description,
				selfClosing: rune.schema.selfClosing ?? false,
				category: RUNE_CATEGORIES[rune.name] ?? 'Other',
				attributes: attrs,
			});
		}
	}

	serveJson(res, { runes: cachedRuneData });
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Resolve a user-provided path within contentDir, returning null if it escapes */
function safePath(contentDir: string, filePath: string): string | null {
	const full = normalize(join(contentDir, filePath));
	if (!full.startsWith(contentDir)) return null;
	return full;
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', chunk => { data += chunk; });
		req.on('end', () => resolve(data));
		req.on('error', reject);
	});
}

interface TreeNode {
	name: string;
	type: 'directory' | 'page' | 'layout';
	path: string;
	draft?: boolean;
	children?: TreeNode[];
	layout?: TreeNode;
}

function directoryToJson(dir: import('@refrakt-md/content').ContentDirectory, rootDir: string): TreeNode {
	const dirRelPath = relative(rootDir, dir.dirPath);
	const node: TreeNode = {
		name: dir.name,
		type: 'directory',
		path: dirRelPath || '',
		children: [],
	};

	if (dir.layout) {
		const { frontmatter } = parseFrontmatter(dir.layout.raw);
		node.layout = {
			name: '_layout.md',
			type: 'layout',
			path: dir.layout.relativePath,
			draft: frontmatter.draft,
		};
	}

	for (const page of dir.pages) {
		const { frontmatter } = parseFrontmatter(page.raw);
		node.children!.push({
			name: page.relativePath.split('/').pop()!,
			type: 'page',
			path: page.relativePath,
			draft: frontmatter.draft,
		});
	}

	for (const child of dir.children) {
		node.children!.push(directoryToJson(child, rootDir));
	}

	return node;
}

function serveJson(res: import('node:http').ServerResponse, data: unknown): void {
	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data, null, 2));
}

function serveHtml(res: import('node:http').ServerResponse, html: string): void {
	res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
	res.end(html);
}
