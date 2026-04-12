import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { runPipeline, renderPage } from './render-pipeline.js';
import { bundleBehaviors } from './bundle-behaviors.js';

export interface BuildOptions {
	dir: string;
	specsDir?: string;
	out: string;
	theme: string;
	baseUrl: string;
	css?: string;
}

export interface BuildResult {
	outputDir: string;
	pages: number;
	files: string[];
}

export async function runBuild(options: BuildOptions): Promise<BuildResult> {
	const { dir, specsDir, out, theme, baseUrl, css } = options;

	const pipeline = await runPipeline({ dir, specsDir, theme, baseUrl });

	const files: string[] = [];

	// Ensure output directory
	fs.mkdirSync(out, { recursive: true });

	// Write combined theme + highlight + custom CSS
	let combinedCss = pipeline.themeCss + (pipeline.highlightCss ? '\n' + pipeline.highlightCss : '');
	if (css) {
		const cssPath = path.resolve(css);
		combinedCss += '\n' + fs.readFileSync(cssPath, 'utf-8');
	}
	fs.writeFileSync(path.join(out, 'theme.css'), combinedCss, 'utf-8');
	files.push('theme.css');

	// Bundle and write behaviors JS
	const behaviorsJs = await bundleBehaviors();
	fs.writeFileSync(path.join(out, 'behaviors.js'), behaviorsJs, 'utf-8');
	files.push('behaviors.js');

	const allPageUrls = [
		{ url: baseUrl, title: pipeline.dashboard.title, draft: false },
		...pipeline.pages.map(p => ({ url: p.url, title: p.title, draft: false })),
	];

	const stylesheets = [`${baseUrl}theme.css`];
	const scripts = [`${baseUrl}behaviors.js`];

	// Write dashboard
	const dashboardHtml = renderPage(pipeline.dashboard, pipeline.navRegion, allPageUrls, {
		stylesheets,
		scripts,
		activeUrl: baseUrl,
	});
	const indexPath = path.join(out, 'index.html');
	fs.writeFileSync(indexPath, dashboardHtml, 'utf-8');
	files.push('index.html');

	// Write entity pages
	for (const page of pipeline.pages) {
		// page.url is like /base/work/work-001.html — strip baseUrl prefix
		const relPath = page.url.startsWith(baseUrl)
			? page.url.slice(baseUrl.length)
			: page.url.replace(/^\//, '');

		const outPath = path.join(out, relPath);
		const outDir = path.dirname(outPath);
		fs.mkdirSync(outDir, { recursive: true });

		const html = renderPage(page, pipeline.navRegion, allPageUrls, {
			stylesheets,
			scripts,
			activeUrl: page.url,
		});
		fs.writeFileSync(outPath, html, 'utf-8');
		files.push(relPath);
	}

	// Run Pagefind to generate the search index
	try {
		execSync(`npx pagefind --site ${JSON.stringify(path.resolve(out))}`, {
			stdio: 'pipe',
			timeout: 60_000,
		});
		files.push('pagefind/');
	} catch {
		console.warn('[plan] Warning: Could not run pagefind. Full-text search will not be available.');
		console.warn('[plan] Install pagefind to enable search: npm install -D pagefind');
	}

	return {
		outputDir: out,
		pages: files.length,
		files,
	};
}
