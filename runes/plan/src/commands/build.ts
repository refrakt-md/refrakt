import * as fs from 'fs';
import * as path from 'path';
import { runPipeline, renderFullPage, getThemeCss } from './render-pipeline.js';

export interface BuildOptions {
	dir: string;
	specsDir?: string;
	out: string;
	theme: string;
	baseUrl: string;
}

export interface BuildResult {
	outputDir: string;
	pages: number;
	files: string[];
}

export function runBuild(options: BuildOptions): BuildResult {
	const { dir, specsDir, out, theme, baseUrl } = options;

	const pipeline = runPipeline({ dir, specsDir, theme, baseUrl });
	const css = getThemeCss(theme);

	const files: string[] = [];

	// Ensure output directory
	fs.mkdirSync(out, { recursive: true });

	// Write dashboard
	const dashboardHtml = renderFullPage(pipeline.dashboard, css, pipeline.nav, baseUrl);
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

		const html = renderFullPage(page, css, pipeline.nav, baseUrl);
		fs.writeFileSync(outPath, html, 'utf-8');
		files.push(relPath);
	}

	return {
		outputDir: out,
		pages: files.length,
		files,
	};
}
