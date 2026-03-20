import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, statSync, renameSync, readdirSync, watch } from 'node:fs';
import { basename, dirname } from 'node:path';
import { join, resolve, normalize, extname, relative } from 'node:path';
import { exec } from 'node:child_process';
import { ContentTree, loadContent } from '@refrakt-md/content';
import { parseFrontmatter, serializeFrontmatter } from '@refrakt-md/content';
import type { HookSet } from '@refrakt-md/content';
import { runes as allRunes, RUNE_EXAMPLES, corePipelineHooks, schemaContentModels } from '@refrakt-md/runes';
import type { ContentModel } from '@refrakt-md/types';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
import type { RouteRule, RunePackage, AggregatedData } from '@refrakt-md/types';
import { createTransform } from '@refrakt-md/transform';
import { bundleCss } from './css.js';
import { renderPreviewPage, renderPreviewContent, type PreviewPipelineOptions } from './preview.js';
import { createHighlightTransform } from '@refrakt-md/highlight';
import { buildPreviewRuntime } from './preview-builder.js';
import { buildCommunityTagsBundle } from './community-tags-builder.js';
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
	/** Absolute path to a static assets directory (served at root, like SvelteKit's static/) */
	staticDir?: string;
	/** Whether to open browser automatically (default: true) */
	open?: boolean;
	/** Absolute path to refrakt.config.json (needed for routeRules editing) */
	configPath?: string;
	/** Route rules from refrakt.config.json */
	routeRules?: RouteRule[];
	/** npm package names of community rune packages (used to build client-side tags bundle) */
	packageNames?: string[];
	/** Community rune packages (for cross-page pipeline hooks) */
	packages?: RunePackage[];
	/** Extra Markdoc tags from community packages (merged into preview pipeline) */
	extraTags?: Record<string, import('@markdoc/markdoc').Schema>;
	/** Community rune metadata for the editor palette */
	communityRunes?: Array<{
		name: string; aliases: string[]; description: string;
		selfClosing: boolean; category: string;
		attributes: Record<string, { type: string; required: boolean; values?: string[] }>;
		example?: string;
		contentModel?: object;
	}>;
}

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg']);

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
		staticDir,
		devServer,
		open = true,
		configPath,
		extraTags,
		communityRunes,
	} = options;

	let routeRules: RouteRule[] = options.routeRules ?? [];

	const absContentDir = resolve(contentDir);
	const appDistDir = resolveAppDist();

	// ── Own-write suppression ────────────────────────────────────
	// When the server writes a file, record the path so the watcher
	// can skip the resulting fs event. Entries expire after 2 seconds.
	const ownWrites = new Map<string, number>();

	function markOwnWrite(relPath: string) {
		ownWrites.set(relPath, Date.now() + 2000);
	}

	function isOwnWrite(relPath: string): boolean {
		const deadline = ownWrites.get(relPath);
		if (!deadline) return false;
		if (Date.now() > deadline) {
			ownWrites.delete(relPath);
			return false;
		}
		ownWrites.delete(relPath);
		return true;
	}

	// ── SSE client connections ──────────────────────────────────
	type SSEClient = import('node:http').ServerResponse;
	const sseClients = new Set<SSEClient>();

	function broadcastSSE(event: string, data: Record<string, unknown>) {
		const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
		for (const client of sseClients) {
			client.write(payload);
		}
	}

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

	// Build community tags bundle for client-side block preview
	let communityTagsBundlePath: string | null = null;
	if (options.packageNames && options.packageNames.length > 0) {
		const result = await buildCommunityTagsBundle(options.packageNames, process.cwd());
		if (result.success) {
			communityTagsBundlePath = result.outputPath;
			console.log('  Community tags: bundled \u2713');
		}
	}

	// Initialize layout resolver for full-page preview with layouts
	const layoutResolver = new LayoutResolver(absContentDir, themeConfig, extraTags);
	await layoutResolver.refresh();

	// Create identity transform once (reused across preview requests)
	const identityTransform = createTransform(themeConfig);

	// ── Cross-page pipeline cache ──────────────────────────────────
	// Runs Phases 2+3 over all pages. Cached result is used for Phase 4
	// (postProcess) in preview and for /api/aggregated autocomplete support.
	let cachedAggregated: AggregatedData = {};

	function buildHookSets(): HookSet[] {
		const sets: HookSet[] = [{ packageName: '__core__', hooks: corePipelineHooks }];
		for (const pkg of options.packages ?? []) {
			if (pkg.pipeline) sets.push({ packageName: pkg.name, hooks: pkg.pipeline });
		}
		return sets;
	}

	async function refreshPipelineCache(): Promise<void> {
		try {
			const site = await loadContent(absContentDir, '/', themeConfig.icons, extraTags, options.packages);
			cachedAggregated = site.aggregated;
			layoutResolver.setAggregated(site.aggregated, buildHookSets());
		} catch {
			// Non-fatal: preview degrades gracefully without aggregated data
		}
	}

	// Run initial pipeline cache (after layoutResolver is ready)
	await refreshPipelineCache();

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
				markOwnWrite(filePath);
				await handlePutFile(req, res, absContentDir, filePath);
				// Refresh layout resolver so layout changes propagate to preview
				layoutResolver.refresh().catch(() => {});
				refreshPipelineCache().catch(() => {});
			} else if (method === 'GET' && url.pathname.startsWith('/api/preview/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/preview/'.length));
				const previewUrl = '/' + filePath.replace(/\.md$/, '').replace(/\/index$/, '');
				handlePreview(res, absContentDir, filePath, themeConfig, themeCss, highlightTransform, extraTags,
					{ aggregated: cachedAggregated, hookSets: buildHookSets(), url: previewUrl });
			} else if (method === 'POST' && url.pathname === '/api/preview') {
				await handlePreviewContent(req, res, themeConfig, themeCss, highlightTransform, extraTags,
					{ aggregated: cachedAggregated, hookSets: buildHookSets() });
			} else if (method === 'POST' && url.pathname === '/api/pages') {
				await handleCreatePage(req, res, absContentDir, markOwnWrite);
			} else if (method === 'POST' && url.pathname === '/api/directories') {
				await handleCreateDirectory(req, res, absContentDir, markOwnWrite);
			} else if (method === 'POST' && url.pathname === '/api/rename') {
				await handleRename(req, res, absContentDir, markOwnWrite);
			} else if (method === 'POST' && url.pathname === '/api/duplicate') {
				await handleDuplicate(req, res, absContentDir, markOwnWrite);
			} else if (method === 'DELETE' && url.pathname.startsWith('/api/files/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/files/'.length));
				markOwnWrite(filePath);
				handleDelete(res, absContentDir, filePath);
			} else if (method === 'POST' && url.pathname === '/api/toggle-draft') {
				await handleToggleDraft(req, res, absContentDir, markOwnWrite);
			} else if (method === 'GET' && url.pathname === '/api/pages-list') {
				await handlePagesList(res, absContentDir);
			} else if (method === 'GET' && url.pathname === '/api/runes') {
				handleGetRunes(res, communityRunes, themeConfig);
			} else if (method === 'GET' && url.pathname === '/api/community-tags.js') {
				if (communityTagsBundlePath) {
					const content = readFileSync(communityTagsBundlePath, 'utf-8');
					res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
					res.end(content);
				} else {
					res.writeHead(404).end('');
				}
			} else if (method === 'GET' && url.pathname === '/api/config') {
				serveJson(res, {
					previewRuntime: previewRuntimeDir !== null,
					hasCommunityTags: communityTagsBundlePath !== null,
					devServerUrl: devServer ?? null,
					themeCss,
					themeConfig: stripFunctions(themeConfig),
				});
			} else if (method === 'GET' && url.pathname === '/api/route-rules') {
				serveJson(res, { routeRules });
			} else if (method === 'PUT' && url.pathname === '/api/route-rules') {
				if (!configPath) {
					res.writeHead(404, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'No config file path available' }));
				} else {
					const body = await readBody(req);
					const { routeRules: newRules } = JSON.parse(body) as { routeRules: RouteRule[] };
					// Update in-memory rules
					routeRules = newRules;
					// Read existing config, update routeRules field, write back
					const configRaw = readFileSync(configPath, 'utf-8');
					const config = JSON.parse(configRaw);
					config.routeRules = newRules;
					writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n', 'utf-8');
					serveJson(res, { ok: true });
				}
			} else if (method === 'POST' && url.pathname === '/api/preview-data') {
				await handlePreviewData(req, res, layoutResolver, identityTransform, highlightTransform);
			} else if (method === 'GET' && url.pathname === '/api/aggregated') {
				serveJson(res, cachedAggregated);
			} else if (method === 'GET' && url.pathname === '/api/events') {
				// SSE endpoint — keep connection open for file-change push events
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
					'Access-Control-Allow-Origin': '*',
				});
				res.write(': connected\n\n');
				sseClients.add(res);
				req.on('close', () => { sseClients.delete(res); });
				return;
			} else if (method === 'GET' && url.pathname === '/api/assets') {
				if (!staticDir) {
					serveJson(res, { images: [] });
				} else {
					const images = listImageAssets(staticDir);
					serveJson(res, { images });
				}
			} else if (method === 'POST' && url.pathname === '/api/assets/upload') {
				if (!staticDir) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'No static directory configured' }));
				} else {
					await handleAssetUpload(req, res, staticDir);
				}
			} else if (previewRuntimeDir && method === 'GET' && url.pathname === '/preview/theme.css') {
				res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
				res.end(themeCss);
			} else if (previewRuntimeDir && method === 'GET' && url.pathname.startsWith('/preview/')) {
				const file = url.pathname.slice('/preview/'.length) || 'index.html';
				serveStatic(res, previewRuntimeDir, '/' + file);
			} else if (staticDir && method === 'GET' && !url.pathname.startsWith('/api/')) {
				// Try project static dir first (images, fonts, etc.), then SPA fallback
				const staticFile = join(staticDir, url.pathname);
				if (staticFile.startsWith(staticDir) && existsSync(staticFile) && statSync(staticFile).isFile()) {
					const ext = extname(staticFile);
					const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
					const content = readFileSync(staticFile);
					res.writeHead(200, { 'Content-Type': contentType });
					res.end(content);
				} else {
					serveStatic(res, appDistDir, url.pathname);
				}
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
		if (staticDir) console.log(`  Static directory: ${staticDir}`);
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

	// ── File watcher ─────────────────────────────────────────────
	// Watch content directory for external changes (other editors, git, etc.)
	const watchDebounce = new Map<string, ReturnType<typeof setTimeout>>();

	watch(absContentDir, { recursive: true }, (eventType, filename) => {
		if (!filename) return;

		// Skip hidden files and directories (.DS_Store, .git, etc.)
		if (filename.split('/').some(part => part.startsWith('.'))) return;

		// Only care about markdown files
		if (!filename.endsWith('.md')) return;

		const relPath = filename;

		// Skip our own writes
		if (isOwnWrite(relPath)) return;

		// Debounce: coalesce rapid events for the same file (300ms)
		clearTimeout(watchDebounce.get(relPath));
		watchDebounce.set(relPath, setTimeout(() => {
			watchDebounce.delete(relPath);

			const fullPath = join(absContentDir, relPath);
			let event: string;

			if (eventType === 'rename') {
				event = existsSync(fullPath) ? 'file-created' : 'file-deleted';
			} else {
				event = 'file-changed';
			}

			broadcastSSE(event, { path: relPath });

			// Refresh layout resolver so layout changes propagate
			layoutResolver.refresh().catch(() => {});
			refreshPipelineCache().catch(() => {});
		}, 300));
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
	extraTags?: Record<string, import('@markdoc/markdoc').Schema>,
	pipelineOptions?: PreviewPipelineOptions,
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

	const html = renderPreviewPage(contentDir, filePath, themeConfig, themeCss, highlight, extraTags, pipelineOptions);
	serveHtml(res, html);
}

async function handlePreviewContent(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	themeConfig: ThemeConfig,
	themeCss: string,
	highlight: (tree: import('@refrakt-md/transform').RendererNode) => import('@refrakt-md/transform').RendererNode,
	extraTags?: Record<string, import('@markdoc/markdoc').Schema>,
	pipelineOptions?: PreviewPipelineOptions,
): Promise<void> {
	const body = await readBody(req);
	const { content } = JSON.parse(body) as { content: string };

	const html = renderPreviewContent(content, themeConfig, themeCss, highlight, extraTags, pipelineOptions);
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
	markOwnWrite: (relPath: string) => void,
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
	markOwnWrite(relativePath);
	serveJson(res, { ok: true, path: relativePath });
}

async function handleCreateDirectory(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
	markOwnWrite: (relPath: string) => void,
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
		const layoutRelPath = parent ? `${parent}/${name}/_layout.md` : `${name}/_layout.md`;
		markOwnWrite(layoutRelPath);
		writeFileSync(join(dirPath, '_layout.md'), layoutContent, 'utf-8');
	}

	const relativePath = parent ? `${parent}/${name}` : name;
	serveJson(res, { ok: true, path: relativePath });
}

async function handleRename(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
	markOwnWrite: (relPath: string) => void,
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
	markOwnWrite(oldPath);
	markOwnWrite(newPath);
	serveJson(res, { ok: true, oldPath, newPath });
}

async function handleDuplicate(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	contentDir: string,
	markOwnWrite: (relPath: string) => void,
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
	markOwnWrite(newPath);
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
	markOwnWrite: (relPath: string) => void,
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
	markOwnWrite(filePath);
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

/** Derive child rune names from the theme config's parent field */
function deriveChildRunes(config?: ThemeConfig): Set<string> {
	const children = new Set<string>();
	if (!config?.runes) return children;
	for (const runeConfig of Object.values(config.runes)) {
		if (runeConfig.parent) children.add(runeConfig.block);
	}
	return children;
}

/**
 * Serialize a content model for JSON transport.
 * Strips non-serializable fields (functions in `custom` models, RegExp in headingExtract).
 * For function-based conditional models, evaluates with empty attrs to get the default.
 */
function serializeContentModel(
	model: ContentModel | ((attrs: Record<string, any>) => ContentModel),
): object | undefined {
	const resolved = typeof model === 'function' ? model({}) : model;
	return stripContentModel(resolved);
}

function stripContentModel(model: ContentModel): object | undefined {
	if ('when' in model) {
		// Conditional model — serialize the default branch
		return stripContentModel(model.default);
	}
	if (model.type === 'custom') {
		return { type: 'custom', description: model.description };
	}
	if (model.type === 'sequence') {
		return { type: 'sequence', fields: model.fields.map(stripField) };
	}
	if (model.type === 'delimited') {
		return {
			type: 'delimited',
			delimiter: model.delimiter,
			zones: model.zones?.map(z => ({
				name: z.name,
				type: 'sequence' as const,
				fields: z.fields.map(stripField),
			})),
			dynamicZones: model.dynamicZones,
			zoneModel: model.zoneModel ? { type: 'sequence' as const, fields: model.zoneModel.fields.map(stripField) } : undefined,
		};
	}
	if (model.type === 'sections') {
		return {
			type: 'sections',
			sectionHeading: model.sectionHeading,
			fields: model.fields?.map(stripField),
			sectionModel: stripContentModel(model.sectionModel),
			emitTag: model.emitTag,
		};
	}
	return undefined;
}

function stripField(f: import('@refrakt-md/types').ContentFieldDefinition): object {
	return {
		name: f.name,
		match: f.match,
		optional: f.optional,
		greedy: f.greedy,
		template: f.template,
		description: f.description,
		emitTag: f.emitTag,
	};
}

let cachedRuneData: unknown[] | null = null;

function handleGetRunes(
	res: import('node:http').ServerResponse,
	communityRunes?: EditorOptions['communityRunes'],
	themeConfig?: ThemeConfig,
): void {
	if (!cachedRuneData) {
		cachedRuneData = [];
		const childRunes = deriveChildRunes(themeConfig);
		for (const rune of Object.values(allRunes)) {
			if (childRunes.has(rune.name)) continue;

			const attrs: Record<string, { type: string; required: boolean; values?: string[] }> = {};
			if (rune.schema.attributes) {
				for (const [name, attr] of Object.entries(rune.schema.attributes)) {
					if ((attr as any).deprecated) continue;
					const typeName = typeof attr.type === 'function'
						? attr.type.name
						: Array.isArray(attr.type)
							? attr.type.map((t: unknown) => (t as { name?: string }).name ?? 'unknown').join(' | ')
							: 'String';
					attrs[name] = {
						type: typeName,
						required: attr.required ?? false,
						...(Array.isArray(attr.matches) ? { values: attr.matches.map(String) } : {}),
						...(attr.description ? { description: attr.description } : {}),
					};
				}
			}

			// Inject preset names for universal attributes from themeConfig
			if (themeConfig?.tints && attrs['tint'] && !attrs['tint'].values) {
				const names = Object.keys(themeConfig.tints);
				if (names.length > 0) attrs['tint'].values = names;
			}
			if (themeConfig?.backgrounds && attrs['bg'] && !attrs['bg'].values) {
				const names = Object.keys(themeConfig.backgrounds);
				if (names.length > 0) attrs['bg'].values = names;
			}

			// Look up content model from the WeakMap
			const rawModel = schemaContentModels.get(rune.schema);
			const contentModel = rawModel ? serializeContentModel(rawModel) : undefined;

			cachedRuneData.push({
				name: rune.name,
				aliases: rune.aliases,
				description: rune.description,
				selfClosing: rune.schema.selfClosing ?? false,
				category: rune.category ?? 'Other',
				attributes: attrs,
				example: RUNE_EXAMPLES[rune.name],
				snippet: rune.snippet,
				contentModel,
			});
		}

		// Append community runes from packages
		if (communityRunes) {
			for (const entry of communityRunes) {
				// Inject preset names for universal attributes on community runes too
				if (themeConfig?.tints && entry.attributes['tint'] && !entry.attributes['tint'].values) {
					const names = Object.keys(themeConfig.tints);
					if (names.length > 0) entry.attributes['tint'].values = names;
				}
				if (themeConfig?.backgrounds && entry.attributes['bg'] && !entry.attributes['bg'].values) {
					const names = Object.keys(themeConfig.backgrounds);
					if (names.length > 0) entry.attributes['bg'].values = names;
				}
				cachedRuneData.push(entry);
			}
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

/** Strip non-serializable function values (postTransform) from ThemeConfig for JSON transport */
function stripFunctions(config: ThemeConfig): ThemeConfig {
	const runes: Record<string, import('@refrakt-md/transform').RuneConfig> = {};
	for (const [name, rune] of Object.entries(config.runes)) {
		const { postTransform, ...rest } = rune;
		runes[name] = rest;
	}
	return { ...config, runes };
}

// ── Asset management ────────────────────────────────────────────────────

function listImageAssets(staticDir: string): Array<{ path: string; name: string; size: number; modified: number }> {
	const results: Array<{ path: string; name: string; size: number; modified: number }> = [];

	function walk(dir: string, prefix: string) {
		let entries;
		try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;
			const fullPath = join(dir, entry.name);
			const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(fullPath, relPath);
			} else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
				const stat = statSync(fullPath);
				results.push({
					path: '/' + relPath,
					name: entry.name,
					size: stat.size,
					modified: stat.mtimeMs,
				});
			}
		}
	}

	walk(staticDir, '');
	results.sort((a, b) => b.modified - a.modified);
	return results;
}

async function handleAssetUpload(
	req: import('node:http').IncomingMessage,
	res: import('node:http').ServerResponse,
	staticDir: string,
): Promise<void> {
	const contentType = req.headers['content-type'] ?? '';
	if (!contentType.startsWith('multipart/form-data')) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Expected multipart/form-data' }));
		return;
	}

	const boundaryMatch = contentType.match(/boundary=(.+?)(?:;|$)/);
	if (!boundaryMatch) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Missing boundary' }));
		return;
	}
	const boundary = boundaryMatch[1];

	// Read full request body as Buffer
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}
	const body = Buffer.concat(chunks);

	// Parse multipart: find the file part
	const boundaryBuf = Buffer.from(`--${boundary}`);
	const parts: Buffer[] = [];
	let start = 0;
	while (true) {
		const idx = body.indexOf(boundaryBuf, start);
		if (idx === -1) break;
		if (start > 0) {
			// Strip leading \r\n and trailing \r\n from previous part
			parts.push(body.subarray(start, idx - 2));
		}
		start = idx + boundaryBuf.length + 2; // skip boundary + \r\n
	}

	let filename: string | null = null;
	let fileData: Buffer | null = null;

	for (const part of parts) {
		// Headers end at \r\n\r\n
		const headerEnd = part.indexOf('\r\n\r\n');
		if (headerEnd === -1) continue;
		const headers = part.subarray(0, headerEnd).toString('utf-8');
		const data = part.subarray(headerEnd + 4);

		const filenameMatch = headers.match(/filename="([^"]+)"/);
		if (filenameMatch) {
			filename = filenameMatch[1];
			fileData = data;
			break;
		}
	}

	if (!filename || !fileData || fileData.length === 0) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'No file provided' }));
		return;
	}

	const ext = extname(filename).toLowerCase();
	if (!IMAGE_EXTENSIONS.has(ext)) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Unsupported image format' }));
		return;
	}

	// Sanitize filename: keep alphanumeric, dots, hyphens
	const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');

	// Avoid overwriting existing files
	let finalName = safeName;
	let counter = 1;
	while (existsSync(join(staticDir, finalName))) {
		const base = safeName.slice(0, -ext.length);
		finalName = `${base}-${counter}${ext}`;
		counter++;
	}

	writeFileSync(join(staticDir, finalName), fileData);

	serveJson(res, { ok: true, path: `/${finalName}`, name: finalName });
}
