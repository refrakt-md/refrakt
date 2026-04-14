import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runInit } from '../src/commands/init.js';

const TMP = join(import.meta.dirname, '.tmp-init-test');

beforeEach(() => {
	mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

describe('plan init', () => {
	it('creates plan directories', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'work'))).toBe(true);
		expect(existsSync(join(planDir, 'spec'))).toBe(true);
		expect(existsSync(join(planDir, 'decision'))).toBe(true);
		expect(existsSync(join(planDir, 'milestone'))).toBe(true);
	});

	it('creates example files', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'spec', 'example-spec.md'))).toBe(true);
		// Work item is created via the template slug
		expect(existsSync(join(planDir, 'work', 'example-work-item.md'))).toBe(true);
		expect(existsSync(join(planDir, 'decision', 'example-decision.md'))).toBe(true);
		expect(existsSync(join(planDir, 'milestone', 'first-release.md'))).toBe(true);
	});

	it('creates index.md', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const index = readFileSync(join(planDir, 'index.md'), 'utf-8');
		expect(index).toContain('# Project Plan');
		expect(index).toContain('refrakt plan next');
	});

	it('creates INSTRUCTIONS.md with workflow guide', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const instructions = readFileSync(join(planDir, 'INSTRUCTIONS.md'), 'utf-8');
		expect(instructions).toContain('# Plan — Workflow Guide');
		expect(instructions).toContain('refrakt plan next');
		expect(instructions).toContain('refrakt plan update');
		expect(instructions).toContain('ID Conventions');
		expect(instructions).toContain('Valid Statuses');
	});

	it('INSTRUCTIONS.md contains no AI tool-specific references', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const instructions = readFileSync(join(planDir, 'INSTRUCTIONS.md'), 'utf-8');
		expect(instructions).not.toContain('Claude');
		expect(instructions).not.toContain('Cursor');
		expect(instructions).not.toContain('Copilot');
	});

	it('creates CLAUDE.md with pointer when no agent files exist (fallback)', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).toContain('plan/INSTRUCTIONS.md');
		expect(claude).toContain('refrakt plan next');
	});

	it('appends pointer to existing CLAUDE.md', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# My Project\n\nExisting content.\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).toContain('# My Project');
		expect(claude).toContain('Existing content.');
		expect(claude).toContain('plan/INSTRUCTIONS.md');
		expect(result.agentFilesUpdated).toContain('CLAUDE.md');
	});

	it('does not duplicate pointer in agent files', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Proj\n\nrefrakt plan next\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		expect(result.agentFilesUpdated).toHaveLength(0);
		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		const matches = claude.match(/refrakt plan next/g);
		expect(matches).toHaveLength(1);
	});

	it('is idempotent — running twice does not create duplicates', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });
		const r2 = runInit({ dir: planDir, projectRoot: TMP });

		expect(r2.created).toHaveLength(0);
		expect(r2.agentFilesUpdated).toHaveLength(0);
	});

	it('reports created files', () => {
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		expect(result.created.length).toBeGreaterThan(0);
		expect(result.dir).toBe(planDir);
	});

	it('--agent claude appends to CLAUDE.md only', () => {
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor rules\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP, agent: 'claude' });

		expect(result.agentFilesUpdated).toEqual(['CLAUDE.md']);
		expect(existsSync(join(TMP, 'CLAUDE.md'))).toBe(true);
		const cursor = readFileSync(join(TMP, '.cursorrules'), 'utf-8');
		expect(cursor).not.toContain('plan/INSTRUCTIONS.md');
	});

	it('--agent cursor appends to .cursorrules', () => {
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor rules\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP, agent: 'cursor' });

		expect(result.agentFilesUpdated).toEqual(['.cursorrules']);
		const cursor = readFileSync(join(TMP, '.cursorrules'), 'utf-8');
		expect(cursor).toContain('plan/INSTRUCTIONS.md');
	});

	it('--agent copilot creates .github/ directory if needed', () => {
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP, agent: 'copilot' });

		expect(result.agentFilesUpdated).toEqual(['.github/copilot-instructions.md']);
		const content = readFileSync(join(TMP, '.github', 'copilot-instructions.md'), 'utf-8');
		expect(content).toContain('plan/INSTRUCTIONS.md');
	});

	it('--agent none skips agent file updates', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Existing\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP, agent: 'none' });

		expect(result.agentFilesUpdated).toHaveLength(0);
		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).not.toContain('plan/INSTRUCTIONS.md');
	});

	it('auto-detect appends to all existing agent files', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Claude\n');
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		expect(result.agentFilesUpdated).toContain('CLAUDE.md');
		expect(result.agentFilesUpdated).toContain('.cursorrules');
	});

	it('example work item is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const work = readFileSync(join(planDir, 'work', 'example-work-item.md'), 'utf-8');
		expect(work).toContain('{% work');
		expect(work).toContain('id="WORK-001"');
		expect(work).toContain('{% /work %}');
	});

	it('example spec is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const spec = readFileSync(join(planDir, 'spec', 'example-spec.md'), 'utf-8');
		expect(spec).toContain('{% spec');
		expect(spec).toContain('{% /spec %}');
	});

	it('example decision is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const decision = readFileSync(join(planDir, 'decision', 'example-decision.md'), 'utf-8');
		expect(decision).toContain('{% decision');
		expect(decision).toContain('{% /decision %}');
	});

	it('example milestone is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const milestone = readFileSync(join(planDir, 'milestone', 'first-release.md'), 'utf-8');
		expect(milestone).toContain('{% milestone');
		expect(milestone).toContain('name="v0.1.0"');
		expect(milestone).toContain('{% /milestone %}');
	});

	it('creates status filter pages for work items', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['in-progress', 'ready', 'blocked', 'done']) {
			const filePath = join(planDir, 'work', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
			expect(content).toContain('{% backlog');
		}
	});

	it('creates status filter pages for specs', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['accepted', 'draft']) {
			const filePath = join(planDir, 'spec', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
		}
	});

	it('creates status filter pages for decisions', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['accepted', 'proposed']) {
			const filePath = join(planDir, 'decision', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
		}
	});

	it('creates status filter pages for milestones', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['active', 'complete']) {
			const filePath = join(planDir, 'milestone', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
		}
	});

	it('creates type-level index pages with status links', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		for (const typeDir of ['work', 'spec', 'decision', 'milestone']) {
			const indexPath = join(planDir, typeDir, 'index.md');
			expect(existsSync(indexPath)).toBe(true);
			const content = readFileSync(indexPath, 'utf-8');
			// Should contain markdown links to status pages
			expect(content).toMatch(/\[.+\]\(.+\)/);
		}
	});

	it('work type index links to all work status pages', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const content = readFileSync(join(planDir, 'work', 'index.md'), 'utf-8');
		expect(content).toContain('[In Progress](in-progress)');
		expect(content).toContain('[Ready](ready)');
		expect(content).toContain('[Blocked](blocked)');
		expect(content).toContain('[Done](done)');
	});

	it('root index links to type directories', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const content = readFileSync(join(planDir, 'index.md'), 'utf-8');
		expect(content).toContain('[Specifications](spec/)');
		expect(content).toContain('[Work Items](work/)');
		expect(content).toContain('[Decisions](decision/)');
		expect(content).toContain('[Milestones](milestone/)');
	});

	it('status filter pages are idempotent', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });
		const r2 = runInit({ dir: planDir, projectRoot: TMP });

		// No new files created on second run
		expect(r2.created).toHaveLength(0);
	});
});
