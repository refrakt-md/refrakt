import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, normalize, extname } from 'node:path';
import { exec } from 'node:child_process';
import { ContentTree } from '@refrakt-md/content';
import { parseFrontmatter } from '@refrakt-md/content';
import type { ThemeConfig } from '@refrakt-md/transform';
import { bundleCss } from './css.js';
import { renderPreviewPage, renderPreviewContent } from './preview.js';
import { createHighlightTransform } from '@refrakt-md/highlight';

export interface EditorOptions {
	/** Absolute path to the content directory */
	contentDir: string;
	/** Port to listen on (default: 4800) */
	port?: number;
	/** Theme configuration object */
	themeConfig: ThemeConfig;
	/** Path to theme's CSS entry file (index.css) */
	themeCssPath?: string;
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
			} else if (method === 'GET' && url.pathname.startsWith('/api/preview/')) {
				const filePath = decodeURIComponent(url.pathname.slice('/api/preview/'.length));
				handlePreview(res, absContentDir, filePath, themeConfig, themeCss, highlightTransform);
			} else if (method === 'POST' && url.pathname === '/api/preview') {
				await handlePreviewContent(req, res, themeConfig, themeCss, highlightTransform);
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
	serveJson(res, directoryToJson(tree.root));
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

	const { writeFileSync } = await import('node:fs');
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

function directoryToJson(dir: import('@refrakt-md/content').ContentDirectory): TreeNode {
	const node: TreeNode = {
		name: dir.name,
		type: 'directory',
		path: '',
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
		node.children!.push(directoryToJson(child));
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
