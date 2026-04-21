import { describe, it, expect, afterEach } from 'vitest';
import { scaffoldPlan } from '../src/scaffold.js';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpTarget(): string {
	return join(
		tmpdir(),
		`create-refrakt-plan-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		'my-plan'
	);
}

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs) {
		rmSync(dir, { recursive: true, force: true });
	}
	cleanupDirs.length = 0;
});

describe('scaffoldPlan', () => {
	it('creates target directory with package.json, .gitignore, and plan/ tree', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);

		// plan/ tree from runInit
		expect(existsSync(join(targetDir, 'plan'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'specs'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'work'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'decisions'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'milestones'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'INSTRUCTIONS.md'))).toBe(true);

		// Example items from runInit
		expect(existsSync(join(targetDir, 'plan', 'specs', 'SPEC-001-example-spec.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'work', 'WORK-001-example-work-item.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'decisions', 'ADR-001-example-decision.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'milestones', 'first-release.md'))).toBe(true);
	});

	it('generates package.json with only CLI + plan devDependencies', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'test-project', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('test-project');
		expect(pkg.private).toBe(true);
		expect(pkg.type).toBe('module');

		// Only CLI + plan — no framework, theme, or rendering deps
		expect(pkg.devDependencies['@refrakt-md/cli']).toBeDefined();
		expect(pkg.devDependencies['@refrakt-md/plan']).toBeDefined();
		expect(Object.keys(pkg.devDependencies).sort()).toEqual([
			'@refrakt-md/cli',
			'@refrakt-md/plan',
		]);

		// Should not carry site/theme deps
		expect(pkg.dependencies).toBeUndefined();
		expect(pkg.devDependencies['@refrakt-md/runes']).toBeUndefined();
		expect(pkg.devDependencies['@refrakt-md/transform']).toBeUndefined();
		expect(pkg.devDependencies['@refrakt-md/lumina']).toBeUndefined();
		expect(pkg.devDependencies['@refrakt-md/sveltekit']).toBeUndefined();
	});

	it('generates plan scripts pointing at refrakt plan CLI', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.scripts.plan).toBe('refrakt plan');
		expect(pkg.scripts['plan:next']).toBe('refrakt plan next');
		expect(pkg.scripts['plan:status']).toBe('refrakt plan status');
		expect(pkg.scripts['plan:validate']).toBe('refrakt plan validate');
	});

	it('does not create a top-level README.md', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		expect(existsSync(join(targetDir, 'README.md'))).toBe(false);
	});

	it('pins CLI + plan to the same version as create-refrakt', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		const ownPkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
		const expected = `~${ownPkg.version}`;
		expect(pkg.devDependencies['@refrakt-md/cli']).toBe(expected);
		expect(pkg.devDependencies['@refrakt-md/plan']).toBe(expected);
	});

	it('writes AGENTS.md at project root via runInit', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);
		const agents = readFileSync(join(targetDir, 'AGENTS.md'), 'utf-8');
		expect(agents).toContain('refrakt plan next');
	});

	it('does not mutate its own package.json during plan/ init', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		// runInit receives noPackageJson: true so our pinned versions survive.
		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.devDependencies['@refrakt-md/cli']).toMatch(/^~/);
		expect(pkg.devDependencies['@refrakt-md/plan']).toMatch(/^~/);
	});

	it('throws when target directory already exists', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldPlan({ projectName: 'my-plan', targetDir });

		expect(() => scaffoldPlan({ projectName: 'my-plan', targetDir })).toThrow('already exists');
	});
});
