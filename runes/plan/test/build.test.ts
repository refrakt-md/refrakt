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
	it('generates static HTML files', () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Build Task
Description.
{% /work %}`);

		const result = runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.pages).toBeGreaterThanOrEqual(2); // dashboard + entity
		expect(result.files).toContain('index.html');

		// Check files exist on disk
		expect(fs.existsSync(path.join(outDir, 'index.html'))).toBe(true);

		// Check entity page exists
		const workFile = result.files.find(f => f.includes('work'));
		expect(workFile).toBeDefined();
		expect(fs.existsSync(path.join(outDir, workFile!))).toBe(true);
	});

	it('generates valid HTML with theme CSS', () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('<!DOCTYPE html>');
		expect(indexHtml).toContain('<style>');
		expect(indexHtml).toContain('--plan-color');
		expect(indexHtml).toContain('rf-plan-sidebar');
	});

	it('applies base-url prefix', () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/refrakt/plan/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('/refrakt/plan/');
	});

	it('creates subdirectories for entity types', () => {
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

		const result = runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(fs.existsSync(path.join(outDir, 'work'))).toBe(true);
		expect(fs.existsSync(path.join(outDir, 'decision'))).toBe(true);
	});

	it('works with minimal theme', () => {
		writeFile('plan/work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Test
Desc.
{% /work %}`);

		const result = runBuild({
			dir: path.join(tmpDir, 'plan'),
			out: outDir,
			theme: 'minimal',
			baseUrl: '/',
		});

		const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
		expect(indexHtml).toContain('<!DOCTYPE html>');
		// Minimal theme inlines its own tokens
		expect(indexHtml).toContain('--plan-font-sans');
	});
});
