import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline, renderPage } from './render-pipeline.js';
import type { PipelineResult } from './render-pipeline.js';
import { bundleBehaviors } from './bundle-behaviors.js';

export interface ServeOptions {
	dir: string;
	specsDir?: string;
	port: number;
	theme: string;
	open: boolean;
	css?: string;
}

export interface ServeResult {
	port: number;
	url: string;
}

export async function runServe(options: ServeOptions): Promise<ServeResult> {
	const { dir, specsDir, port, theme, open, css } = options;
	const baseUrl = '/';

	let pipeline: PipelineResult = undefined!;
	let combinedCss: string;
	let behaviorsJs: string;
	let pageIndex: Map<string, string>;
	let ready = false;

	async function rebuild() {
		pipeline = await runPipeline({ dir, specsDir, theme, baseUrl });
		combinedCss = pipeline.themeCss + (pipeline.highlightCss ? '\n' + pipeline.highlightCss : '');
		if (css) {
			combinedCss += '\n' + fs.readFileSync(path.resolve(css), 'utf-8');
		}
		behaviorsJs = await bundleBehaviors();

		const allPageUrls = [
			{ url: baseUrl, title: pipeline.dashboard.title, draft: false },
			...pipeline.pages.map(p => ({ url: p.url, title: p.title, draft: false })),
		];

		const stylesheets = ['/__plan-theme.css'];
		const scripts = ['/__plan-behaviors.js'];
		const newIndex = new Map<string, string>();

		// Index all pages
		for (const page of pipeline.pages) {
			newIndex.set(page.url, renderPage(page, pipeline.navRegion, allPageUrls, {
				hotReload: true,
				stylesheets,
				scripts,
				activeUrl: page.url,
			}));
		}
		// Dashboard
		const dashHtml = renderPage(pipeline.dashboard, pipeline.navRegion, allPageUrls, {
			hotReload: true,
			stylesheets,
			scripts,
			activeUrl: baseUrl,
		});
		newIndex.set(baseUrl, dashHtml);
		newIndex.set(`${baseUrl}index.html`, dashHtml);

		// Swap atomically so in-flight requests never see a partial index
		pageIndex = newIndex;
		ready = true;
	}

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

	// Loading page shown while pipeline builds
	const loadingPage = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Plan — Building...</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#555}
.loader{text-align:center}.spinner{width:24px;height:24px;border:3px solid #ddd;border-top-color:#888;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div class="loader"><div class="spinner"></div><p>Building plan site...</p>
<script>(function(){var es=new EventSource('/__plan-reload');es.onmessage=function(e){if(e.data==='reload')location.reload();};})()</script>
</div></body></html>`;

	// HTTP server — starts immediately, serves loading page until pipeline is ready
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

		// While building, serve a loading page
		if (!ready) {
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(loadingPage);
			return;
		}

		// Serve theme CSS
		if (url === '/__plan-theme.css') {
			res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
			res.end(combinedCss);
			return;
		}

		// Serve bundled behaviors JS
		if (url === '/__plan-behaviors.js') {
			res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
			res.end(behaviorsJs);
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

	// Start the server immediately so the user sees something right away
	server.listen(port, () => {
		const serverUrl = `http://localhost:${port}`;
		console.log(`[plan] Dev server running at ${serverUrl}`);
		console.log(`[plan] Building...`);

		if (open) {
			openBrowser(serverUrl);
		}
	});

	// Build the pipeline in the background — loading page is shown until ready
	await rebuild();
	console.log(`[plan] Ready — ${pipeline.pages.length} entity pages + dashboard`);
	console.log(`[plan] Watching for changes...`);
	notifyReload();

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
