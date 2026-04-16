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
		expect(existsSync(join(planDir, 'specs'))).toBe(true);
		expect(existsSync(join(planDir, 'decisions'))).toBe(true);
		expect(existsSync(join(planDir, 'milestones'))).toBe(true);
	});

	it('creates example files', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'specs', 'example-spec.md'))).toBe(true);
		// Work item is created via the template slug
		expect(existsSync(join(planDir, 'work', 'example-work-item.md'))).toBe(true);
		expect(existsSync(join(planDir, 'decisions', 'example-decision.md'))).toBe(true);
		expect(existsSync(join(planDir, 'milestones', 'first-release.md'))).toBe(true);
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

		const spec = readFileSync(join(planDir, 'specs', 'example-spec.md'), 'utf-8');
		expect(spec).toContain('{% spec');
		expect(spec).toContain('{% /spec %}');
	});

	it('example decision is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const decision = readFileSync(join(planDir, 'decisions', 'example-decision.md'), 'utf-8');
		expect(decision).toContain('{% decision');
		expect(decision).toContain('{% /decision %}');
	});

	it('example milestone is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const milestone = readFileSync(join(planDir, 'milestones', 'first-release.md'), 'utf-8');
		expect(milestone).toContain('{% milestone');
		expect(milestone).toContain('name="v0.1.0"');
		expect(milestone).toContain('{% /milestone %}');
	});

	it('does not create status filter, index, or dashboard pages (generated dynamically)', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		// No status filter pages
		expect(existsSync(join(planDir, 'work', 'in-progress.md'))).toBe(false);
		expect(existsSync(join(planDir, 'work', 'ready.md'))).toBe(false);
		expect(existsSync(join(planDir, 'specs', 'draft.md'))).toBe(false);
		expect(existsSync(join(planDir, 'decisions', 'proposed.md'))).toBe(false);
		expect(existsSync(join(planDir, 'milestones', 'active.md'))).toBe(false);

		// No type-level index pages
		expect(existsSync(join(planDir, 'work', 'index.md'))).toBe(false);
		expect(existsSync(join(planDir, 'specs', 'index.md'))).toBe(false);

		// No root index.md (dashboard is generated dynamically)
		expect(existsSync(join(planDir, 'index.md'))).toBe(false);
	});
});
