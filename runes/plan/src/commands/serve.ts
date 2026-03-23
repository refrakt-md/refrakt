import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline, renderFullPage, getThemeCss } from './render-pipeline.js';
import type { PipelineResult, RenderedPage, NavGroup } from './render-pipeline.js';

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

export function runServe(options: ServeOptions): ServeResult {
	const { dir, specsDir, port, theme, open } = options;
	const baseUrl = '/';

	let pipeline: PipelineResult;
	let css: string;
	let pageIndex: Map<string, string>;

	function rebuild() {
		pipeline = runPipeline({ dir, specsDir, theme, baseUrl });
		css = getThemeCss(theme);
		pageIndex = new Map();

		// Index all pages
		for (const page of pipeline.pages) {
			pageIndex.set(page.url, renderFullPage(page, css, pipeline.nav, baseUrl, { hotReload: true }));
		}
		// Dashboard
		pageIndex.set(baseUrl, renderFullPage(pipeline.dashboard, css, pipeline.nav, baseUrl, { hotReload: true }));
		pageIndex.set(`${baseUrl}index.html`, renderFullPage(pipeline.dashboard, css, pipeline.nav, baseUrl, { hotReload: true }));
	}

	rebuild();

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
				try {
					rebuild();
					notifyReload();
				} catch (err: any) {
					console.error(`[plan] Rebuild error: ${err.message}`);
				}
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
