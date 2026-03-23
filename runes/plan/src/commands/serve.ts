import * as http from 'http';
import * as fs from 'fs';
import { runPipeline, renderPage } from './render-pipeline.js';
import type { PipelineResult } from './render-pipeline.js';

export interface ServeOptions {
	dir: string;
	specsDir?: string;
	port: number;
	theme: string;
	open: boolean;
}

export interface ServeResult {
	port: number;
	url: string;
}

export async function runServe(options: ServeOptions): Promise<ServeResult> {
	const { dir, specsDir, port, theme, open } = options;
	const baseUrl = '/';

	let pipeline: PipelineResult;
	let combinedCss: string;
	let pageIndex: Map<string, string>;

	async function rebuild() {
		pipeline = await runPipeline({ dir, specsDir, theme, baseUrl });
		combinedCss = pipeline.themeCss + (pipeline.highlightCss ? '\n' + pipeline.highlightCss : '');

		const allPageUrls = [
			{ url: baseUrl, title: pipeline.dashboard.title, draft: false },
			...pipeline.pages.map(p => ({ url: p.url, title: p.title, draft: false })),
		];

		const stylesheets = ['/__plan-theme.css'];
		pageIndex = new Map();

		// Index all pages
		for (const page of pipeline.pages) {
			pageIndex.set(page.url, renderPage(page, pipeline.navRegion, allPageUrls, {
				hotReload: true,
				stylesheets,
				activeUrl: page.url,
			}));
		}
		// Dashboard
		const dashHtml = renderPage(pipeline.dashboard, pipeline.navRegion, allPageUrls, {
			hotReload: true,
			stylesheets,
			activeUrl: baseUrl,
		});
		pageIndex.set(baseUrl, dashHtml);
		pageIndex.set(`${baseUrl}index.html`, dashHtml);
	}

	await rebuild();

	// SSE clients for hot reload
	const sseClients: http.ServerResponse[] = [];

	function notifyReload() {
		for (const client of sseClients) {
			try {
				client.write('data: reload\n\n');
			} catch { /* client disconnected */ }
		}
	}

	// File watching
	const watchDirs = [dir];
	if (specsDir && specsDir !== dir) watchDirs.push(specsDir);

	for (const watchDir of watchDirs) {
		if (!fs.existsSync(watchDir)) continue;
		try {
			fs.watch(watchDir, { recursive: true }, (event, filename) => {
				if (!filename || !filename.endsWith('.md')) return;
				console.log(`[plan] File changed: ${filename}, rebuilding...`);
				rebuild().then(() => {
					notifyReload();
				}).catch((err: any) => {
					console.error(`[plan] Rebuild error: ${err.message}`);
				});
			});
		} catch {
			// fs.watch not supported on all platforms with recursive
			console.warn(`[plan] Warning: Could not watch ${watchDir} recursively. Hot reload may not work.`);
		}
	}

	// HTTP server
	const server = http.createServer((req, res) => {
		const url = req.url || '/';

		// SSE endpoint for hot reload
		if (url === '/__plan-reload') {
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			});
			res.write('data: connected\n\n');
			sseClients.push(res);
			req.on('close', () => {
				const idx = sseClients.indexOf(res);
				if (idx !== -1) sseClients.splice(idx, 1);
			});
			return;
		}

		// Serve theme CSS
		if (url === '/__plan-theme.css') {
			res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
			res.end(combinedCss);
			return;
		}

		// Find the page
		let html = pageIndex.get(url);
		if (!html && url.endsWith('/')) {
			html = pageIndex.get(`${url}index.html`);
		}
		if (!html && !url.includes('.')) {
			html = pageIndex.get(`${url}.html`);
		}

		if (html) {
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(html);
		} else {
			res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(`<html><body><h1>404 Not Found</h1><p>${escapeHtml(url)}</p></body></html>`);
		}
	});

	server.listen(port, () => {
		const serverUrl = `http://localhost:${port}`;
		console.log(`[plan] Dev server running at ${serverUrl}`);
		console.log(`[plan] Serving ${pipeline.pages.length} entity pages + dashboard`);
		console.log(`[plan] Watching for changes...`);

		if (open) {
			openBrowser(serverUrl);
		}
	});

	return { port, url: `http://localhost:${port}` };
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openBrowser(url: string) {
	const { platform } = process;
	const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
	import('child_process').then(cp => cp.exec(`${cmd} ${url}`)).catch(() => {});
}
