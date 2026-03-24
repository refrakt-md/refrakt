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
		const result = runInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'work'))).toBe(true);
		expect(existsSync(join(planDir, 'spec'))).toBe(true);
		expect(existsSync(join(planDir, 'decision'))).toBe(true);
		expect(existsSync(join(planDir, 'milestone'))).toBe(true);
	});

	it('creates example files', () => {
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

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

	it('creates CLAUDE.md with workflow section when it does not exist', () => {
		const planDir = join(TMP, 'plan');
		runInit({ dir: planDir, projectRoot: TMP });

		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).toContain('refrakt plan next');
		expect(claude).toContain('refrakt plan update');
	});

	it('appends workflow section to existing CLAUDE.md', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# My Project\n\nExisting content.\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).toContain('# My Project');
		expect(claude).toContain('Existing content.');
		expect(claude).toContain('refrakt plan next');
		expect(result.claudeMdUpdated).toBe(true);
	});

	it('does not duplicate workflow section in CLAUDE.md', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Proj\n\nrefrakt plan next\n');
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		expect(result.claudeMdUpdated).toBe(false);
		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		// Should appear exactly once
		const matches = claude.match(/refrakt plan next/g);
		expect(matches).toHaveLength(1);
	});

	it('is idempotent — running twice does not create duplicates', () => {
		const planDir = join(TMP, 'plan');
		const r1 = runInit({ dir: planDir, projectRoot: TMP });
		const r2 = runInit({ dir: planDir, projectRoot: TMP });

		expect(r2.created).toHaveLength(0);
		expect(r2.claudeMdUpdated).toBe(false);
	});

	it('reports created files', () => {
		const planDir = join(TMP, 'plan');
		const result = runInit({ dir: planDir, projectRoot: TMP });

		expect(result.created.length).toBeGreaterThan(0);
		expect(result.dir).toBe(planDir);
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
});
