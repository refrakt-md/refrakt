import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runBuild } from '../src/commands/build.js';

let tmpDir: string;
let outDir: string;

function writeFile(relPath: string, content: string) {
	const fullPath = path.join(tmpDir, relPath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content, 'utf-8');
}

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-build-'));
	outDir = path.join(tmpDir, 'out');
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('runBuild', () => {
	it('generates static HTML files', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Build Task
Description.
{% /work %}`);

		const result = await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.pages).toBeGreaterThanOrEqual(2); // dashboard + entity + theme.css
		expect(result.files).toContain('index.html');

		// Check files exist on disk
		expect(fs.existsSync(path.join(outDir, 'index.html'))).toBe(true);

		// Check entity page exists
		const workFile = result.files.find(f => f.includes('work'));
		expect(workFile).toBeDefined();
		expect(fs.existsSync(path.join(outDir, workFile!))).toBe(true);
	});

	it('generates valid HTML with stylesheet link', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('<!DOCTYPE html>');
		// CSS is now a separate file, referenced via stylesheet link
		expect(indexHtml).toContain('<link rel="stylesheet"');
		expect(indexHtml).toContain('theme.css');

		// Theme CSS file is written separately
		expect(fs.existsSync(path.join(outDir, 'theme.css'))).toBe(true);
		const themeCss = fs.readFileSync(path.join(outDir, 'theme.css'), 'utf-8');
		expect(themeCss).toContain('--rf-color');
	});

	it('generates layout structure in HTML', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('rf-plan-sidebar');
	});

	it('applies base-url prefix', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/refrakt/plan/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('/refrakt/plan/');
	});

	it('creates subdirectories for entity types', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		writeFile('plan/decision/adr-001.md', `{% decision id="ADR-001" status="accepted" date="2026-01-01" %}
# Decision
## Context
C.
## Decision
D.
{% /decision %}`);

		await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(fs.existsSync(path.join(outDir, 'work'))).toBe(true);
		expect(fs.existsSync(path.join(outDir, 'decision'))).toBe(true);
	});

	it('works with minimal theme', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'minimal',
			baseUrl: '/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('<!DOCTYPE html>');
		// Minimal theme tokens are in the separate CSS file
		const themeCss = fs.readFileSync(path.join(outDir, 'theme.css'), 'utf-8');
		expect(themeCss).toContain('--plan-font-sans');
	});

	it('includes copy-to-clipboard script', async () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		await runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		// Behaviors JS is included as a script tag
		expect(indexHtml).toContain('behaviors.js');
		// The bundled JS contains the copy behavior's class name
		const behaviorsJs = fs.readFileSync(path.join(outDir, 'behaviors.js'), 'utf-8');
		expect(behaviorsJs).toContain('rf-copy-btn');
	});
});
