import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runPipeline } from '../src/commands/render-pipeline.js';

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
	it('renders entity pages from plan files', () => {
		writeFile('work/task-001.md', `{% work id="WORK-001" status="ready" priority="high" %}
# First Task
Description of the task.
{% /work %}`);

		writeFile('spec/spec-001.md', `{% spec id="SPEC-001" status="accepted" %}
# My Spec

> Summary.

Body content.
{% /spec %}`);

		const result = runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.pages).toHaveLength(2);
		expect(result.dashboard).toBeDefined();

		// Check work page
		const workPage = result.pages.find(p => p.entityId === 'WORK-001');
		expect(workPage).toBeDefined();
		expect(workPage!.html).toContain('First Task');
		expect(workPage!.type).toBe('work');

		// Check spec page
		const specPage = result.pages.find(p => p.entityId === 'SPEC-001');
		expect(specPage).toBeDefined();
		expect(specPage!.html).toContain('My Spec');
	});

	it('generates auto-dashboard when no index.md exists', () => {
		writeFile('work/task-001.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Description.
{% /work %}`);

		const result = runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.dashboard).toBeDefined();
		expect(result.dashboard.title).toBe('Plan Dashboard');
		// Dashboard should contain backlog rune output (rendered by pipeline)
		expect(result.dashboard.html).toBeTruthy();
	});

	it('uses user index.md when it exists', () => {
		writeFile('work/task-001.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Description.
{% /work %}`);

		writeFile('index.md', `# Custom Dashboard

My custom plan overview.`);

		const result = runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		expect(result.dashboard.html).toContain('Custom Dashboard');
	});

	it('builds navigation groups from entity types', () => {
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

		const result = runPipeline({
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

	it('applies base-url prefix to page URLs', () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		const result = runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/project/plan/',
		});

		expect(result.pages[0].url).toContain('/project/plan/');
	});

	it('works with minimal theme', () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Task
Desc.
{% /work %}`);

		// Should not throw
		const result = runPipeline({
			dir: tmpDir,
			theme: 'minimal',
			baseUrl: '/',
		});

		expect(result.pages).toHaveLength(1);
	});

	it('populates backlog rune in dashboard via pipeline', () => {
		writeFile('work/w1.md', `{% work id="WORK-001" status="ready" priority="high" %}
# Ready Task
Description.
{% /work %}`);

		writeFile('work/w2.md', `{% work id="WORK-002" status="done" priority="low" %}
# Done Task
Description.
{% /work %}`);

		const result = runPipeline({
			dir: tmpDir,
			theme: 'default',
			baseUrl: '/',
		});

		// The auto-generated dashboard has a backlog with filter="status:ready"
		// After pipeline postProcess, it should contain the ready task
		expect(result.dashboard.html).toContain('WORK-001');
	});
});
