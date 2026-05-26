import { describe, it, expect, afterEach } from 'vitest';
import { scaffoldPlanSite } from '../src/scaffold.js';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpTarget(): string {
	return join(
		tmpdir(),
		`create-refrakt-plan-site-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		'my-plan',
	);
}

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs) {
		rmSync(dir, { recursive: true, force: true });
	}
	cleanupDirs.length = 0;
});

describe('scaffoldPlanSite (SPEC-071 / WORK-271)', () => {
	it('scaffolds a runnable plan site for the sveltekit target', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		// Adapter scaffold lays down its usual files (vite + svelte.config + content/).
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'vite.config.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'svelte.config.js'))).toBe(true);

		// Plan seed via runInit.
		expect(existsSync(join(targetDir, 'plan', 'specs'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'work'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'decisions'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'milestones'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'specs', 'SPEC-001-example-spec.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'plan', 'work', 'WORK-001-example-work-item.md'))).toBe(true);

		// content/ content dir authored.
		for (const f of ['_layout.md', 'index.md', 'work.md', 'specs.md', 'bugs.md', 'decisions.md', 'milestones.md']) {
			expect(existsSync(join(targetDir, 'content', f)), `missing content/${f}`).toBe(true);
		}
	});

	it('overrides refrakt.config.json with the plan-site shape (plan plugin + entityRoutes)', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		const cfg = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(cfg.sites.main.contentDir).toBe('./content');
		expect(cfg.sites.main.plugins).toEqual(['@refrakt-md/plan']);
		expect(cfg.plan.dir).toBe('plan');

		const types = (cfg.sites.main.entityRoutes as Array<{ type: string }>).map((r) => r.type).sort();
		expect(types).toEqual(['bug', 'decision', 'milestone', 'spec', 'work']);
		for (const rule of cfg.sites.main.entityRoutes as Array<{ render: string }>) {
			expect(rule.render).toMatch(/\{% expand .* \/%\}/);
		}
	});

	it('package.json gains @refrakt-md/plan + cli and plan:* scripts', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.dependencies['@refrakt-md/plan']).toMatch(/^~/);
		expect(pkg.devDependencies['@refrakt-md/cli']).toMatch(/^~/);
		expect(pkg.scripts.plan).toBe('refrakt plan');
		expect(pkg.scripts['plan:next']).toBe('refrakt plan next');
		expect(pkg.scripts['plan:status']).toBe('refrakt plan status');
		expect(pkg.scripts['plan:validate']).toBe('refrakt plan validate');
		// Adapter dev script preserved.
		expect(pkg.scripts.dev).toBeDefined();
	});

	it('versions on @refrakt-md/plan + cli match create-refrakt own version', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		const ownPkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
		const expected = `~${ownPkg.version}`;
		expect(pkg.dependencies['@refrakt-md/plan']).toBe(expected);
		expect(pkg.devDependencies['@refrakt-md/cli']).toBe(expected);
	});

	it('content/_layout.md uses the docs layout sidebar pattern', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		const layout = readFileSync(join(targetDir, 'content', '_layout.md'), 'utf-8');
		expect(layout).toContain('{% layout %}');
		expect(layout).toContain('{% nav');
		for (const link of ['/specs', '/work', '/bugs', '/decisions', '/milestones']) {
			expect(layout).toContain(link);
		}
	});

	it('content/index.md composes plan-progress + plan-activity + ready backlog + decision-log', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		const index = readFileSync(join(targetDir, 'content', 'index.md'), 'utf-8');
		expect(index).toContain('{% plan-progress /%}');
		expect(index).toContain('{% plan-activity');
		expect(index).toContain('{% backlog filter="status:ready"');
		expect(index).toContain('{% decision-log');
	});

	it('throws when target directory already exists', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' });

		await expect(
			scaffoldPlanSite({ projectName: 'my-plan', targetDir, target: 'sveltekit' }),
		).rejects.toThrow('already exists');
	});
});
