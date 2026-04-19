import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runInit, type InitOptions } from '../src/commands/init.js';

// Use os.tmpdir() so findInstallRoot doesn't walk up into the real repo's
// workspace root (which would cause tests to target the wrong package.json).
let TMP: string;

beforeEach(() => {
	TMP = mkdtempSync(join(tmpdir(), 'refrakt-plan-init-'));
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

/**
 * Default-safe wrapper: opts out of package.json / hook / wrapper wiring so
 * tests don't accidentally modify the real plan package.json (findInstallRoot
 * walks up and finds it). Override with `{ noPackageJson: false }` etc. when
 * the test is specifically exercising those features — in which case the
 * caller is responsible for putting a package.json fixture in TMP first.
 */
function safeInit(options: InitOptions): ReturnType<typeof runInit> {
	return runInit({
		noPackageJson: true,
		noHooks: true,
		noWrapper: true,
		...options,
	});
}

describe('plan init — scaffolding', () => {
	it('creates plan directories', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'work'))).toBe(true);
		expect(existsSync(join(planDir, 'specs'))).toBe(true);
		expect(existsSync(join(planDir, 'decisions'))).toBe(true);
		expect(existsSync(join(planDir, 'milestones'))).toBe(true);
	});

	it('creates example files', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'specs', 'example-spec.md'))).toBe(true);
		expect(existsSync(join(planDir, 'work', 'example-work-item.md'))).toBe(true);
		expect(existsSync(join(planDir, 'decisions', 'example-decision.md'))).toBe(true);
		expect(existsSync(join(planDir, 'milestones', 'first-release.md'))).toBe(true);
	});

	it('creates index.md', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const index = readFileSync(join(planDir, 'index.md'), 'utf-8');
		expect(index).toContain('# Project Plan');
		expect(index).toContain('refrakt plan next');
	});

	it('creates INSTRUCTIONS.md with workflow guide', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const instructions = readFileSync(join(planDir, 'INSTRUCTIONS.md'), 'utf-8');
		expect(instructions).toContain('# Plan — Workflow Guide');
		expect(instructions).toContain('refrakt plan next');
		expect(instructions).toContain('refrakt plan update');
		expect(instructions).toContain('ID Conventions');
		expect(instructions).toContain('Valid Statuses');
	});

	it('INSTRUCTIONS.md contains no AI tool-specific references', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const instructions = readFileSync(join(planDir, 'INSTRUCTIONS.md'), 'utf-8');
		expect(instructions).not.toContain('Claude');
		expect(instructions).not.toContain('Cursor');
		expect(instructions).not.toContain('Copilot');
	});

	it('is idempotent — running twice does not create duplicates', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });
		const r2 = safeInit({ dir: planDir, projectRoot: TMP });

		expect(r2.created).toHaveLength(0);
		expect(r2.agentFilesUpdated).toHaveLength(0);
	});

	it('does not crash when seed IDs already exist in other files', () => {
		// Simulate an existing project where the user already has WORK-001,
		// SPEC-001, ADR-001, v0.1.0 under different slugs. init used to call
		// runCreate() blindly and throw EXIT_DUPLICATE_ID.
		const planDir = join(TMP, 'plan');
		mkdirSync(join(planDir, 'work'), { recursive: true });
		mkdirSync(join(planDir, 'specs'), { recursive: true });
		mkdirSync(join(planDir, 'decisions'), { recursive: true });
		mkdirSync(join(planDir, 'milestones'), { recursive: true });
		writeFileSync(join(planDir, 'work', 'my-task.md'), '{% work id="WORK-001" status="ready" %}\n# Mine\n{% /work %}\n');
		writeFileSync(join(planDir, 'specs', 'my-spec.md'), '{% spec id="SPEC-001" status="draft" %}\n# Mine\n{% /spec %}\n');
		writeFileSync(join(planDir, 'decisions', 'my-decision.md'), '{% decision id="ADR-001" status="proposed" %}\n# Mine\n{% /decision %}\n');
		writeFileSync(join(planDir, 'milestones', 'mine.md'), '{% milestone name="v0.1.0" status="planning" %}\n# Mine\n{% /milestone %}\n');

		expect(() => safeInit({ dir: planDir, projectRoot: TMP })).not.toThrow();

		// Example files should be skipped — user's own content is preserved untouched.
		expect(existsSync(join(planDir, 'work', 'example-work-item.md'))).toBe(false);
		expect(existsSync(join(planDir, 'specs', 'example-spec.md'))).toBe(false);
		expect(existsSync(join(planDir, 'decisions', 'example-decision.md'))).toBe(false);
		expect(existsSync(join(planDir, 'milestones', 'first-release.md'))).toBe(false);
		expect(readFileSync(join(planDir, 'work', 'my-task.md'), 'utf-8')).toContain('# Mine');
	});

	it('creates only the examples whose IDs are still free', () => {
		// Partial collision: user has WORK-001 but not the others. init should
		// scaffold the non-colliding examples and skip just the WORK one.
		const planDir = join(TMP, 'plan');
		mkdirSync(join(planDir, 'work'), { recursive: true });
		writeFileSync(join(planDir, 'work', 'my-task.md'), '{% work id="WORK-001" status="ready" %}\n# Mine\n{% /work %}\n');

		safeInit({ dir: planDir, projectRoot: TMP });

		expect(existsSync(join(planDir, 'work', 'example-work-item.md'))).toBe(false);
		expect(existsSync(join(planDir, 'specs', 'example-spec.md'))).toBe(true);
		expect(existsSync(join(planDir, 'decisions', 'example-decision.md'))).toBe(true);
		expect(existsSync(join(planDir, 'milestones', 'first-release.md'))).toBe(true);
	});

	it('reports created files', () => {
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		expect(result.created.length).toBeGreaterThan(0);
		expect(result.dir).toBe(planDir);
	});
});

describe('plan init — AGENTS.md as canonical', () => {
	it('creates AGENTS.md with full workflow content', () => {
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		const agents = readFileSync(join(TMP, 'AGENTS.md'), 'utf-8');
		expect(agents).toContain('# Agent Instructions');
		expect(agents).toContain('## Plan — Workflow Guide');
		expect(agents).toContain('refrakt plan next');
		expect(agents).toContain('Before you start');
		expect(result.agentFilesUpdated).toContain('AGENTS.md');
	});

	it('creates CLAUDE.md as a pointer to AGENTS.md (fallback)', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).toContain('See [AGENTS.md]');
		expect(claude).not.toContain('## Plan — Workflow Guide');
	});

	it('appends pointer to existing CLAUDE.md without clobbering', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# My Project\n\nExisting content.\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).toContain('# My Project');
		expect(claude).toContain('Existing content.');
		expect(claude).toContain('See [AGENTS.md]');
		expect(result.agentFilesUpdated).toContain('CLAUDE.md');
	});

	it('does not duplicate pointer when AGENTS.md marker already present', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Proj\n\nSee [AGENTS.md](./AGENTS.md) for ...\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		expect(result.agentFilesUpdated).not.toContain('CLAUDE.md');
		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		const matches = claude.match(/See \[AGENTS\.md\]/g);
		expect(matches).toHaveLength(1);
	});

	it('recognises the legacy pointer marker to avoid duplication', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Proj\n\nrefrakt plan next — old pointer\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		expect(result.agentFilesUpdated).not.toContain('CLAUDE.md');
	});

	it('appends Plan section to existing AGENTS.md without overwriting', () => {
		writeFileSync(join(TMP, 'AGENTS.md'), '# My existing agent file\n\nSome rules here.\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		const agents = readFileSync(join(TMP, 'AGENTS.md'), 'utf-8');
		expect(agents).toContain('# My existing agent file');
		expect(agents).toContain('Some rules here.');
		expect(agents).toContain('## Plan — Workflow Guide');
		expect(result.agentFilesUpdated).toContain('AGENTS.md');
	});

	it('does not re-append Plan section if AGENTS.md already has it', () => {
		safeInit({ dir: join(TMP, 'plan'), projectRoot: TMP });
		const r2 = safeInit({ dir: join(TMP, 'plan'), projectRoot: TMP });
		expect(r2.agentFilesUpdated).not.toContain('AGENTS.md');
	});

	it('--agent claude creates AGENTS.md + CLAUDE.md pointer only', () => {
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor rules\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP, agent: 'claude' });

		expect(result.agentFilesUpdated).toContain('AGENTS.md');
		expect(result.agentFilesUpdated).toContain('CLAUDE.md');
		const cursor = readFileSync(join(TMP, '.cursorrules'), 'utf-8');
		expect(cursor).not.toContain('AGENTS.md');
	});

	it('--agent cursor creates AGENTS.md + .cursorrules pointer', () => {
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor rules\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP, agent: 'cursor' });

		expect(result.agentFilesUpdated).toContain('AGENTS.md');
		expect(result.agentFilesUpdated).toContain('.cursorrules');
		expect(existsSync(join(TMP, 'CLAUDE.md'))).toBe(false);
		const cursor = readFileSync(join(TMP, '.cursorrules'), 'utf-8');
		expect(cursor).toContain('See [AGENTS.md]');
	});

	it('--agent copilot creates .github/ directory if needed', () => {
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP, agent: 'copilot' });

		expect(result.agentFilesUpdated).toContain('.github/copilot-instructions.md');
		const content = readFileSync(join(TMP, '.github', 'copilot-instructions.md'), 'utf-8');
		expect(content).toContain('See [AGENTS.md]');
	});

	it('--agent none skips all agent file updates including AGENTS.md', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Existing\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP, agent: 'none' });

		expect(result.agentFilesUpdated).toHaveLength(0);
		expect(existsSync(join(TMP, 'AGENTS.md'))).toBe(false);
		const claude = readFileSync(join(TMP, 'CLAUDE.md'), 'utf-8');
		expect(claude).not.toContain('AGENTS.md');
	});

	it('auto-detect appends to all existing agent files plus AGENTS.md', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Claude\n');
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor\n');
		const planDir = join(TMP, 'plan');
		const result = safeInit({ dir: planDir, projectRoot: TMP });

		expect(result.agentFilesUpdated).toContain('AGENTS.md');
		expect(result.agentFilesUpdated).toContain('CLAUDE.md');
		expect(result.agentFilesUpdated).toContain('.cursorrules');
	});
});

describe('plan init — package.json wiring', () => {
	function writeHostPkg(body: Record<string, any> = {}) {
		writeFileSync(join(TMP, 'package.json'), JSON.stringify(body, null, 2));
	}

	it('adds devDependencies + plan script to existing package.json', () => {
		writeHostPkg({ name: 'host', version: '1.0.0' });
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});

		expect(result.packageJsonUpdated).toBe(true);
		expect(result.installRoot).toBe(TMP);
		const pkg = JSON.parse(readFileSync(join(TMP, 'package.json'), 'utf-8'));
		expect(pkg.scripts.plan).toBe('refrakt plan');
		expect(pkg.devDependencies['@refrakt-md/cli']).toBe('^0.9.9');
		expect(pkg.devDependencies['@refrakt-md/plan']).toBe('^0.9.9');
	});

	it('preserves existing scripts and devDependencies', () => {
		writeHostPkg({
			name: 'host',
			scripts: { build: 'vite build', test: 'vitest' },
			devDependencies: { vitest: '^1.0.0' },
		});
		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});

		const pkg = JSON.parse(readFileSync(join(TMP, 'package.json'), 'utf-8'));
		expect(pkg.scripts.build).toBe('vite build');
		expect(pkg.scripts.test).toBe('vitest');
		expect(pkg.scripts.plan).toBe('refrakt plan');
		expect(pkg.devDependencies.vitest).toBe('^1.0.0');
		expect(pkg.devDependencies['@refrakt-md/cli']).toBe('^0.9.9');
	});

	it('does not clobber an existing plan script', () => {
		writeHostPkg({ name: 'host', scripts: { plan: 'custom-plan-cmd' } });
		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});
		const pkg = JSON.parse(readFileSync(join(TMP, 'package.json'), 'utf-8'));
		expect(pkg.scripts.plan).toBe('custom-plan-cmd');
	});

	it('does not re-add deps already present in dependencies', () => {
		writeHostPkg({
			name: 'host',
			dependencies: { '@refrakt-md/cli': '0.9.0' },
		});
		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});
		const pkg = JSON.parse(readFileSync(join(TMP, 'package.json'), 'utf-8'));
		expect(pkg.dependencies['@refrakt-md/cli']).toBe('0.9.0');
		expect(pkg.devDependencies?.['@refrakt-md/cli']).toBeUndefined();
	});

	it('is idempotent on re-run', () => {
		writeHostPkg({ name: 'host' });
		const r1 = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});
		expect(r1.packageJsonUpdated).toBe(true);
		const r2 = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});
		expect(r2.packageJsonUpdated).toBe(false);
	});

	it('--no-package-json skips modifying package.json', () => {
		writeHostPkg({ name: 'host' });
		const result = safeInit({ dir: join(TMP, 'plan'), projectRoot: TMP });
		expect(result.packageJsonUpdated).toBe(false);
		const pkg = JSON.parse(readFileSync(join(TMP, 'package.json'), 'utf-8'));
		expect(pkg.scripts).toBeUndefined();
	});

	it('detects pnpm workspace root by pnpm-workspace.yaml', () => {
		writeHostPkg({ name: 'root' });
		writeFileSync(join(TMP, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
		mkdirSync(join(TMP, 'apps', 'docs'), { recursive: true });
		writeFileSync(join(TMP, 'apps', 'docs', 'package.json'), JSON.stringify({ name: 'docs' }));
		writeFileSync(join(TMP, 'pnpm-lock.yaml'), '');

		const result = runInit({
			dir: join(TMP, 'apps', 'docs', 'plan'),
			projectRoot: join(TMP, 'apps', 'docs'),
			noHooks: true,
			noWrapper: true,
			versions: { cli: '0.9.9', plan: '0.9.9' },
		});
		expect(result.installRoot).toBe(TMP);
		expect(result.packageManager).toBe('pnpm');
		const rootPkg = JSON.parse(readFileSync(join(TMP, 'package.json'), 'utf-8'));
		expect(rootPkg.devDependencies['@refrakt-md/cli']).toBe('^0.9.9');
	});
});

describe('plan init — Claude SessionStart hook', () => {
	it('writes .claude/settings.json with SessionStart hook when --agent claude', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'claude',
			noPackageJson: true,
			noWrapper: true,
		});
		expect(result.hookWritten).toBe(true);
		const settings = JSON.parse(readFileSync(join(TMP, '.claude', 'settings.json'), 'utf-8'));
		expect(settings.hooks.SessionStart).toHaveLength(1);
		const cmd = settings.hooks.SessionStart[0].hooks[0].command as string;
		expect(cmd).toContain('node_modules/.bin/refrakt');
		expect(cmd).toContain('pnpm install');
		expect(cmd).toContain('yarn install');
		expect(cmd).toContain('bun install');
		expect(cmd).toContain('npm install');
	});

	it('auto-detect writes hook when CLAUDE.md exists', () => {
		writeFileSync(join(TMP, 'CLAUDE.md'), '# Claude\n');
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noWrapper: true,
		});
		expect(result.hookWritten).toBe(true);
	});

	it('auto-detect writes hook when only .cursorrules exists (falls back to claude for hook)', () => {
		// Only cursor file exists — auto-detect will NOT create CLAUDE.md, so hook should be skipped.
		writeFileSync(join(TMP, '.cursorrules'), '# Cursor\n');
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noWrapper: true,
		});
		expect(result.hookWritten).toBe(false);
		expect(existsSync(join(TMP, '.claude', 'settings.json'))).toBe(false);
	});

	it('--agent cursor skips Claude hook', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'cursor',
			noPackageJson: true,
			noWrapper: true,
		});
		expect(result.hookWritten).toBe(false);
	});

	it('--agent none skips Claude hook', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'none',
			noPackageJson: true,
			noWrapper: true,
		});
		expect(result.hookWritten).toBe(false);
	});

	it('--no-hooks skips Claude hook', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'claude',
			noPackageJson: true,
			noWrapper: true,
			noHooks: true,
		});
		expect(result.hookWritten).toBe(false);
	});

	it('hook is idempotent — does not duplicate on re-run', () => {
		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'claude',
			noPackageJson: true,
			noWrapper: true,
		});
		const r2 = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'claude',
			noPackageJson: true,
			noWrapper: true,
		});
		expect(r2.hookWritten).toBe(false);
		const settings = JSON.parse(readFileSync(join(TMP, '.claude', 'settings.json'), 'utf-8'));
		expect(settings.hooks.SessionStart).toHaveLength(1);
	});

	it('merges into existing .claude/settings.json without clobbering other hooks', () => {
		mkdirSync(join(TMP, '.claude'), { recursive: true });
		writeFileSync(join(TMP, '.claude', 'settings.json'), JSON.stringify({
			hooks: {
				SessionStart: [{ hooks: [{ type: 'command', command: 'echo existing' }] }],
				Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }],
			},
		}));

		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'claude',
			noPackageJson: true,
			noWrapper: true,
		});

		const settings = JSON.parse(readFileSync(join(TMP, '.claude', 'settings.json'), 'utf-8'));
		expect(settings.hooks.SessionStart).toHaveLength(2);
		expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('echo existing');
		expect(settings.hooks.Stop).toBeDefined();
	});
});

describe('plan init — ./plan.sh wrapper script', () => {
	it('writes plan.sh with shebang and PM detection', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noHooks: true,
		});
		expect(result.wrapperWritten).toBe(true);
		const script = readFileSync(join(TMP, 'plan.sh'), 'utf-8');
		expect(script).toMatch(/^#!\/usr\/bin\/env sh/);
		expect(script).toContain('node_modules/.bin/refrakt');
		expect(script).toContain('pnpm install');
		expect(script).toContain('exec npx refrakt plan');
	});

	it('plan.sh is executable', () => {
		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noHooks: true,
		});
		const mode = statSync(join(TMP, 'plan.sh')).mode & 0o777;
		// At minimum user-executable (0o100).
		expect(mode & 0o100).toBe(0o100);
	});

	it('--no-wrapper skips writing plan.sh', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noHooks: true,
			noWrapper: true,
		});
		expect(result.wrapperWritten).toBe(false);
		expect(existsSync(join(TMP, 'plan.sh'))).toBe(false);
	});

	it('--agent none skips plan.sh', () => {
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			agent: 'none',
			noPackageJson: true,
			noHooks: true,
		});
		expect(result.wrapperWritten).toBe(false);
	});

	it('does not overwrite a pre-existing plan.sh with different content', () => {
		writeFileSync(join(TMP, 'plan.sh'), '#!/bin/sh\necho custom\n');
		const result = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noHooks: true,
		});
		expect(result.wrapperWritten).toBe(false);
		const script = readFileSync(join(TMP, 'plan.sh'), 'utf-8');
		expect(script).toContain('echo custom');
	});

	it('is idempotent', () => {
		runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noHooks: true,
		});
		const r2 = runInit({
			dir: join(TMP, 'plan'),
			projectRoot: TMP,
			noPackageJson: true,
			noHooks: true,
		});
		expect(r2.wrapperWritten).toBe(false);
	});
});

describe('plan init — example file content', () => {
	it('example work item is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const work = readFileSync(join(planDir, 'work', 'example-work-item.md'), 'utf-8');
		expect(work).toContain('{% work');
		expect(work).toContain('id="WORK-001"');
		expect(work).toContain('{% /work %}');
	});

	it('example spec is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const spec = readFileSync(join(planDir, 'specs', 'example-spec.md'), 'utf-8');
		expect(spec).toContain('{% spec');
		expect(spec).toContain('{% /spec %}');
	});

	it('example decision is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const decision = readFileSync(join(planDir, 'decisions', 'example-decision.md'), 'utf-8');
		expect(decision).toContain('{% decision');
		expect(decision).toContain('{% /decision %}');
	});

	it('example milestone is valid markdoc', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const milestone = readFileSync(join(planDir, 'milestones', 'first-release.md'), 'utf-8');
		expect(milestone).toContain('{% milestone');
		expect(milestone).toContain('name="v0.1.0"');
		expect(milestone).toContain('{% /milestone %}');
	});

	it('creates status filter pages for work items', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

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
		safeInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['accepted', 'draft']) {
			const filePath = join(planDir, 'specs', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
		}
	});

	it('creates status filter pages for decisions', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['accepted', 'proposed']) {
			const filePath = join(planDir, 'decisions', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
		}
	});

	it('creates status filter pages for milestones', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		for (const status of ['active', 'complete']) {
			const filePath = join(planDir, 'milestones', `${status}.md`);
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content).toContain(`filter="status:${status}"`);
		}
	});

	it('creates type-level index pages with status links', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		for (const typeDir of ['work', 'specs', 'decisions', 'milestones']) {
			const indexPath = join(planDir, typeDir, 'index.md');
			expect(existsSync(indexPath)).toBe(true);
			const content = readFileSync(indexPath, 'utf-8');
			expect(content).toMatch(/\[.+\]\(.+\)/);
		}
	});

	it('work type index links to all work status pages', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const content = readFileSync(join(planDir, 'work', 'index.md'), 'utf-8');
		expect(content).toContain('[In Progress](in-progress)');
		expect(content).toContain('[Ready](ready)');
		expect(content).toContain('[Blocked](blocked)');
		expect(content).toContain('[Done](done)');
	});

	it('root index links to type directories', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });

		const content = readFileSync(join(planDir, 'index.md'), 'utf-8');
		expect(content).toContain('[Specifications](specs/)');
		expect(content).toContain('[Work Items](work/)');
		expect(content).toContain('[Decisions](decisions/)');
		expect(content).toContain('[Milestones](milestones/)');
	});

	it('status filter pages are idempotent', () => {
		const planDir = join(TMP, 'plan');
		safeInit({ dir: planDir, projectRoot: TMP });
		const r2 = safeInit({ dir: planDir, projectRoot: TMP });

		expect(r2.created).toHaveLength(0);
	});
});
