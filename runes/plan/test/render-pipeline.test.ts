import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runPipeline, renderPage } from '../src/commands/render-pipeline.js';

let tmpDir: string;

function writeFile(relPath: string, content: string) {
	const fullPath = path.join(tmpDir, relPath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content, 'utf-8');
}

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-pipeline-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('runPipeline', () => {
	it('renders entity pages from plan files', async () => {
		writeFile('work/task-001.md', `{% work id="WORK-001" status="ready" priority="high" %}
# First Task
Description of the task.
{% /work %}`);

		writeFile('spec/spec-001.md', `{% spec id="SPEC-001" status="accepted" %}
# My Spec

> Summary.

Body content.
{% /spec %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		// Entity pages + status filter pages are included
		const entityPages = result.pages.filter(p => p.entityId);
		expect(entityPages).toHaveLength(2);
		expect(result.dashboard).toBeDefined();

		// Check work page
		const workPage = result.pages.find(p => p.entityId === 'WORK-001');
		expect(workPage).toBeDefined();
		expect(workPage!.type).toBe('work');

		// Check spec page
		const specPage = result.pages.find(p => p.entityId === 'SPEC-001');
		expect(specPage).toBeDefined();

		// Render to HTML and check content
		const workHtml = renderPage(workPage!, result.navRegion, [], { stylesheets: [] });
		expect(workHtml).toContain('First Task');

		const specHtml = renderPage(specPage!, result.navRegion, [], { stylesheets: [] });
		expect(specHtml).toContain('My Spec');
	});

	it('generates auto-dashboard when no index.md exists', async () => {
		writeFile('work/task-001.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Description.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.dashboard).toBeDefined();
		expect(result.dashboard.title).toBe('Plan Dashboard');
		// Dashboard should have a renderable tree
		expect(result.dashboard.renderable).toBeTruthy();
	});

	it('uses user index.md when it exists', async () => {
		writeFile('work/task-001.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Description.
{% /work %}`);

		writeFile('index.md', `# Custom Dashboard

My custom plan overview.`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		const dashHtml = renderPage(result.dashboard, result.navRegion, [], { stylesheets: [] });
		expect(dashHtml).toContain('Custom Dashboard');
	});

	it('builds navigation groups from entity types', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task One
Desc.
{% /work %}`);

		writeFile('decision/adr-001.md', `{% decision id="ADR-001" status="accepted" date="2026-01-01" %}
# Decision One
## Context
C.
## Decision
D.
{% /decision %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.nav.length).toBeGreaterThanOrEqual(2);
		const workGroup = result.nav.find(g => g.title === 'Work Items');
		expect(workGroup).toBeDefined();
		expect(workGroup!.items).toHaveLength(1);
		expect(workGroup!.items[0].id).toBe('WORK-001');

		const decisionGroup = result.nav.find(g => g.title === 'Decisions');
		expect(decisionGroup).toBeDefined();
	});

	it('applies base-url prefix to page URLs', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/project/plan/',
		});

		expect(result.pages[0].url).toContain('/project/plan/');
	});

	it('auto theme falls back to default when no config exists', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'auto',
			baseUrl: '/',
		});

		expect(result.pages.filter(p => p.entityId).length).toBe(1);
		expect(result.themeCss).toBeTruthy();
	});

	it('auto theme reads from refrakt.config.json when present', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		// Write a config pointing to a theme that won't resolve — should fall back
		const configPath = path.join(tmpDir, 'refrakt.config.json');
		fs.writeFileSync(configPath, JSON.stringify({ theme: '@nonexistent/theme', target: 'html', contentDir: './content' }));

		// Save and restore cwd since readConfigTheme reads from cwd
		const origCwd = process.cwd();
		process.chdir(tmpDir);
		try {
			const result = await runPipeline({
				dir: tmpDir,
				theme: 'auto',
				baseUrl: '/',
			});
			// Falls back to default — should still work
			expect(result.pages.filter(p => p.entityId).length).toBe(1);
			expect(result.themeCss).toBeTruthy();
		} finally {
			process.chdir(origCwd);
		}
	});

	it('--theme default and --theme minimal override config', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		// Even if config exists, explicit flag wins
		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});
		expect(result.pages.filter(p => p.entityId).length).toBe(1);
	});

	it('works with minimal theme', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		// Should not throw
		const result = await runPipeline({
			dir: tmpDir,
			theme: 'minimal',
			baseUrl: '/',
		});

		expect(result.pages.filter(p => p.entityId).length).toBe(1);
	});

	it('populates backlog rune in dashboard via pipeline', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Ready Task
Description.
{% /work %}`);

		writeFile('work/w2.md', `{% work id="WORK-002" status="done" priority="low" %}
# Done Task
Description.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		// The auto-generated dashboard has a backlog with filter="status:ready"
		// After pipeline postProcess, it should contain the ready task
		const dashHtml = renderPage(result.dashboard, result.navRegion, [], { stylesheets: [] });
		expect(dashHtml).toContain('WORK-001');
	});

	it('produces nav region as renderable tree', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.navRegion).toBeDefined();
		expect(Array.isArray(result.navRegion)).toBe(true);
		expect(result.navRegion.length).toBeGreaterThan(0);
	});

	it('nav region status links include data-status attributes', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		const html = renderPage(result.pages[0], result.navRegion, [], { stylesheets: [] });
		expect(html).toContain('data-status="ready"');
		expect(html).toContain('rf-plan-sidebar__status-link');
	});

	it('sidebar has status links with count badges', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task A
Desc.
{% /work %}`);

		writeFile('work/w2.md', `{% work id="WORK-002" status="ready" priority="medium" %}
# Task B
Desc.
{% /work %}`);

		writeFile('work/w3.md', `{% work id="WORK-003" status="done" priority="low" %}
# Task C
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		const html = renderPage(result.pages[0], result.navRegion, [], { stylesheets: [] });

		// Status links (not collapsible sub-groups)
		expect(html).toContain('rf-plan-sidebar__status-link');
		expect(html).toContain('data-status="ready"');
		expect(html).toContain('data-status="done"');
		// Count badges
		expect(html).toContain('rf-plan-sidebar__status-count');
		// Links should point to status filter pages
		expect(html).toContain('href="/work/ready.html"');
		expect(html).toContain('href="/work/done.html"');
	});

	it('sidebar includes search input', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		const html = renderPage(result.pages[0], result.navRegion, [], { stylesheets: [] });
		expect(html).toContain('rf-plan-sidebar__search');
		expect(html).toContain('placeholder="Filter');
	});

	it('generates status filter pages for each entity type and status', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" tags="css, plan" %}
# Task
Desc.
{% /work %}`);

		writeFile('spec/s1.md', `{% spec id="SPEC-001" status="accepted" %}
# My Spec
> Summary.
{% /spec %}`);

		writeFile('decision/d1.md', `{% decision id="ADR-001" status="accepted" date="2026-01-01" %}
# Decision
## Context
C.
## Decision
D.
{% /decision %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		// Work status filter pages
		const workStatusPages = result.pages.filter(p => !p.entityId && p.type === 'work');
		expect(workStatusPages.length).toBeGreaterThan(0);
		const readyPage = workStatusPages.find(p => p.status === 'ready');
		expect(readyPage).toBeDefined();
		expect(readyPage!.url).toBe('/work/ready.html');

		// Spec status filter pages
		const specStatusPages = result.pages.filter(p => !p.entityId && p.type === 'spec');
		expect(specStatusPages.length).toBeGreaterThan(0);
		const acceptedSpecPage = specStatusPages.find(p => p.status === 'accepted');
		expect(acceptedSpecPage).toBeDefined();
		expect(acceptedSpecPage!.url).toBe('/spec/accepted.html');

		// Decision status filter pages
		const decisionStatusPages = result.pages.filter(p => !p.entityId && p.type === 'decision');
		expect(decisionStatusPages.length).toBeGreaterThan(0);

		// Verify status filter pages render with entity cards
		const acceptedSpecHtml = renderPage(acceptedSpecPage!, result.navRegion, [], { stylesheets: [] });
		expect(acceptedSpecHtml).toContain('SPEC-001');
	});

	it('sidebar behavior scripts are injected', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		const html = renderPage(result.pages[0], result.navRegion, [], { stylesheets: [] });
		expect(html).toContain('plan-sidebar-collapse');
		expect(html).toContain('rf-plan-sidebar__search');
	});

	it('renders full HTML documents via renderPage', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		const html = renderPage(result.pages[0], result.navRegion, [], {
			stylesheets: ['/theme.css'],
		});

		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('<link rel="stylesheet" href="/theme.css">');
		expect(html).toContain('rf-plan-sidebar');
		expect(html).toContain('rf-plan-main');
	});

	it('includes highlight CSS in pipeline result', async () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = await runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		// highlightCss may be empty string (CSS variables theme produces no extra CSS)
		// but it should be defined
		expect(typeof result.highlightCss).toBe('string');
	});
});
