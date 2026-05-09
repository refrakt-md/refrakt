import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePlanDir, scaffoldRefraktConfigForPlan } from '../src/plan-config.js';

let tempDir: string;
const ORIGINAL_ENV = process.env.REFRAKT_PLAN_DIR;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-plan-config-'));
	delete process.env.REFRAKT_PLAN_DIR;
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
	if (ORIGINAL_ENV !== undefined) process.env.REFRAKT_PLAN_DIR = ORIGINAL_ENV;
	else delete process.env.REFRAKT_PLAN_DIR;
});

describe('resolvePlanDir', () => {
	it('returns the explicit flag when provided (highest precedence)', () => {
		writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify({ plan: { dir: 'config-plan' } }));
		process.env.REFRAKT_PLAN_DIR = 'env-plan';
		const result = resolvePlanDir('flag-plan', tempDir);
		expect(result).toEqual({ dir: 'flag-plan', source: 'flag' });
	});

	it('falls back to env var when no flag is given', () => {
		writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify({ plan: { dir: 'config-plan' } }));
		process.env.REFRAKT_PLAN_DIR = 'env-plan';
		const result = resolvePlanDir(undefined, tempDir);
		expect(result).toEqual({ dir: 'env-plan', source: 'env' });
	});

	it('falls back to config when no flag and no env var', () => {
		writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify({ plan: { dir: 'config-plan' } }));
		const result = resolvePlanDir(undefined, tempDir);
		expect(result).toEqual({ dir: 'config-plan', source: 'config' });
	});

	it('falls back to "plan" when nothing is set', () => {
		const result = resolvePlanDir(undefined, tempDir);
		expect(result).toEqual({ dir: 'plan', source: 'default' });
	});

	it('handles a config file that is missing the plan section', () => {
		writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify({ site: { contentDir: './content', theme: 't', target: 'svelte' } }));
		const result = resolvePlanDir(undefined, tempDir);
		expect(result.source).toBe('default');
	});

	it('handles a malformed config file gracefully', () => {
		writeFileSync(join(tempDir, 'refrakt.config.json'), '{not json}');
		const result = resolvePlanDir(undefined, tempDir);
		expect(result.source).toBe('default');
	});
});

describe('scaffoldRefraktConfigForPlan', () => {
	it('creates refrakt.config.json when absent', () => {
		const result = scaffoldRefraktConfigForPlan({ projectRoot: tempDir, planDir: join(tempDir, 'plan') });
		expect(result.action).toBe('created');
		const written = JSON.parse(readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8'));
		expect(written).toEqual({ plan: { dir: 'plan' } });
	});

	it('extends an existing config without a plan section', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({ site: { contentDir: './content', theme: 't', target: 'svelte' } }, null, '\t'),
		);
		const result = scaffoldRefraktConfigForPlan({ projectRoot: tempDir, planDir: join(tempDir, 'plan') });
		expect(result.action).toBe('extended');
		const written = JSON.parse(readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8'));
		expect(written.plan).toEqual({ dir: 'plan' });
		expect(written.site).toBeDefined(); // existing site section preserved
	});

	it('preserves an existing plan section without overwriting', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({ plan: { dir: 'custom-plan' } }, null, '\t'),
		);
		const result = scaffoldRefraktConfigForPlan({ projectRoot: tempDir, planDir: join(tempDir, 'plan') });
		expect(result.action).toBe('preserved');
		const written = JSON.parse(readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8'));
		expect(written.plan).toEqual({ dir: 'custom-plan' });
	});

	it('skips when the existing config is invalid JSON', () => {
		writeFileSync(join(tempDir, 'refrakt.config.json'), '{not json}');
		const result = scaffoldRefraktConfigForPlan({ projectRoot: tempDir, planDir: join(tempDir, 'plan') });
		expect(result.action).toBe('skipped');
		expect(readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8')).toBe('{not json}');
	});

	it('writes a relative plan dir when planDir is inside projectRoot', () => {
		const result = scaffoldRefraktConfigForPlan({ projectRoot: tempDir, planDir: join(tempDir, 'subdir/plan') });
		expect(result.action).toBe('created');
		const written = JSON.parse(readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8'));
		expect(written.plan.dir).toBe('subdir/plan');
	});

	it('preserves indent style of an existing config', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			'{\n  "site": {\n    "contentDir": "./content",\n    "theme": "t",\n    "target": "svelte"\n  }\n}',
		);
		const result = scaffoldRefraktConfigForPlan({ projectRoot: tempDir, planDir: join(tempDir, 'plan') });
		expect(result.action).toBe('extended');
		const text = readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8');
		// 2-space indent should have been detected
		expect(text).toContain('  "plan"');
	});
});
