import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EntityRegistration, EntityRegistry, PipelineContext } from '@refrakt-md/types';
import { planPipelineHooks, setPlanDir, setProjectRoot } from '../src/pipeline.js';

/**
 * Tests for the SPEC-064 / WORK-251 unconditional-scan path on plan plugin's
 * register hook. The scan reads plan.dir for every plan entity, registers
 * each with `sourceFile` + `extract`, and lets site-load registrations win
 * any duplicate.
 *
 * These tests drive the hook directly with a synthetic registry — the same
 * pattern other plan-plugin tests use. The full content-pipeline integration
 * is exercised by the broader site-loading tests once snippet (WORK-255)
 * lands.
 */

function makeRegistry() {
	const entries: EntityRegistration[] = [];
	const byTypeId = new Map<string, Map<string, EntityRegistration>>();
	const registry: EntityRegistry = {
		register(entry: EntityRegistration) {
			entries.push(entry);
			if (!byTypeId.has(entry.type)) byTypeId.set(entry.type, new Map());
			byTypeId.get(entry.type)!.set(entry.id, entry);
		},
		getAll(type: string) { return entries.filter(e => e.type === type); },
		getById(type: string, id: string) { return byTypeId.get(type)?.get(id); },
		getByUrl(type: string, url: string) { return entries.filter(e => e.type === type && e.sourceUrl === url); },
		getTypes() { return [...new Set(entries.map(e => e.type))]; },
	};
	return { entries, registry };
}

function makeCtx() {
	const warnings: Array<{ severity: string; message: string }> = [];
	const ctx: PipelineContext = {
		info: (msg) => warnings.push({ severity: 'info', message: msg }),
		warn: (msg) => warnings.push({ severity: 'warning', message: msg }),
		error: (msg) => warnings.push({ severity: 'error', message: msg }),
	};
	return { ctx, warnings };
}

describe('planPipelineHooks unconditional scan (SPEC-064)', () => {
	let tmpRoot: string;
	let planDir: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-plan-scan-'));
		planDir = join(tmpRoot, 'plan');
		mkdirSync(join(planDir, 'specs'), { recursive: true });
		mkdirSync(join(planDir, 'work'), { recursive: true });
		setPlanDir(planDir);
		setProjectRoot(tmpRoot);
	});

	afterEach(() => {
		// Reset module state to avoid cross-test bleed.
		setPlanDir('');
		setProjectRoot('');
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('registers a spec entity from a plan.dir file with sourceFile + extract', () => {
		writeFileSync(
			join(planDir, 'specs', 'SPEC-100-auth-system.md'),
			'{% spec id="SPEC-100" status="accepted" %}\n# Auth System\n\nDescription.\n{% /spec %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		expect(entries).toHaveLength(1);
		const entity = entries[0];
		expect(entity.type).toBe('spec');
		expect(entity.id).toBe('SPEC-100');
		expect(entity.sourceUrl).toBeUndefined();
		expect(entity.sourceFile).toBe('plan/specs/SPEC-100-auth-system.md');
		expect(typeof entity.extract).toBe('function');
		expect(entity.data.title).toBe('Auth System');
		expect(entity.data.status).toBe('accepted');
	});

	it('lets site-load registrations win any duplicate', () => {
		// Plan file on disk.
		writeFileSync(
			join(planDir, 'specs', 'SPEC-101-shared.md'),
			'{% spec id="SPEC-101" status="ready" %}\n# Shared\n{% /spec %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();

		// Pre-register as if it came from site-load (with a real URL).
		registry.register({
			type: 'spec',
			id: 'SPEC-101',
			sourceUrl: '/plan/specs/SPEC-101',
			data: { title: 'Shared from site' },
		});

		planPipelineHooks.register!([], registry, ctx);

		// Only the original (site-loaded) registration survives.
		const allSpecs = entries.filter(e => e.type === 'spec' && e.id === 'SPEC-101');
		expect(allSpecs).toHaveLength(1);
		expect(allSpecs[0].sourceUrl).toBe('/plan/specs/SPEC-101');
		expect(allSpecs[0].data.title).toBe('Shared from site');
	});

	it("registers files whose filename doesn't match the auto-ID convention if the rune has a valid id=", () => {
		writeFileSync(
			join(planDir, 'specs', 'arbitrarily-named.md'),
			'{% spec id="SPEC-102" %}\n# Spec 102\n{% /spec %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe('SPEC-102');
	});

	it('silently skips files with no parseable plan rune (READMEs, notes)', () => {
		writeFileSync(
			join(planDir, 'README.md'),
			'# Plan directory\n\nThis directory holds the project plan content. No plan rune here.\n',
		);
		writeFileSync(
			join(planDir, 'specs', 'SPEC-103-real.md'),
			'{% spec id="SPEC-103" %}\n# Real spec\n{% /spec %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx, warnings } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe('SPEC-103');
		// No warning emitted for the README — it's silently treated as auxiliary content.
		expect(warnings.filter(w => w.message.includes('README'))).toHaveLength(0);
	});

	it('errors on duplicate IDs across two different plan files', () => {
		writeFileSync(
			join(planDir, 'specs', 'SPEC-200-a.md'),
			'{% spec id="SPEC-200" %}\n# A\n{% /spec %}\n',
		);
		writeFileSync(
			join(planDir, 'specs', 'SPEC-200-b.md'),
			'{% spec id="SPEC-200" %}\n# B\n{% /spec %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx, warnings } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		// First one wins; second triggers an error warning.
		expect(entries).toHaveLength(1);
		const errors = warnings.filter(w => w.severity === 'error');
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0].message).toContain('SPEC-200');
		expect(errors[0].message).toContain('duplicate');
	});

	it('is a silent no-op when plan.dir does not exist', () => {
		setPlanDir(join(tmpRoot, 'does-not-exist'));

		const { entries, registry } = makeRegistry();
		const { ctx, warnings } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		expect(entries).toHaveLength(0);
		expect(warnings.filter(w => w.severity === 'error')).toHaveLength(0);
	});

	it('registers a milestone using its name attribute (not id)', () => {
		mkdirSync(join(planDir, 'milestones'), { recursive: true });
		writeFileSync(
			join(planDir, 'milestones', 'v1.0.0.md'),
			'{% milestone name="v1.0.0" status="active" %}\n# v1.0.0 — First Release\n{% /milestone %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('milestone');
		expect(entries[0].id).toBe('v1.0.0');
		expect(entries[0].sourceFile).toBe('plan/milestones/v1.0.0.md');
	});

	it("the registered extract function returns the top-level plan rune AST node", () => {
		writeFileSync(
			join(planDir, 'specs', 'SPEC-300-extract.md'),
			'{% spec id="SPEC-300" status="draft" %}\n# Extract test\n\nBody.\n{% /spec %}\n',
		);

		const { entries, registry } = makeRegistry();
		const { ctx } = makeCtx();
		planPipelineHooks.register!([], registry, ctx);

		const entity = entries[0];
		expect(entity.extract).toBeDefined();

		// Drive the extract function with a freshly-parsed source AST.
		// The extractor finds the top-level `spec` rune with matching id.
		const Markdoc = require('@markdoc/markdoc').default ?? require('@markdoc/markdoc');
		const source = '{% spec id="SPEC-300" status="draft" %}\n# Extract test\n{% /spec %}\n';
		const parsed = Markdoc.parse(source);
		const extracted = entity.extract!(parsed);
		expect(extracted).not.toBeNull();
		expect(extracted!.type).toBe('tag');
		expect((extracted as any).tag).toBe('spec');
	});
});

describe('planPipelineHooks.configure', () => {
	let tmpRoot: string;
	let planDir: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-plan-configure-'));
		planDir = join(tmpRoot, 'plan');
		mkdirSync(planDir);
	});

	afterEach(() => {
		setPlanDir('');
		setProjectRoot('');
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('resolves plan.dir against configDir and registers `plan:` file root', async () => {
		const registered: Array<{ ns: string; abs: string }> = [];
		await planPipelineHooks.configure!({
			config: { plan: { dir: 'plan' } },
			configDir: tmpRoot,
			registerFileRoot: (ns, abs) => registered.push({ ns, abs }),
		});

		expect(registered).toEqual([{ ns: 'plan', abs: planDir }]);
	});

	it('skips file-root registration when plan.dir is not configured', async () => {
		const registered: Array<{ ns: string; abs: string }> = [];
		await planPipelineHooks.configure!({
			config: {},
			configDir: tmpRoot,
			registerFileRoot: (ns, abs) => registered.push({ ns, abs }),
		});

		expect(registered).toHaveLength(0);
	});

	it('tolerates configs that have no plan section at all', async () => {
		const registered: Array<{ ns: string; abs: string }> = [];
		// Should not throw, should not register.
		await expect(
			planPipelineHooks.configure!({
				config: null,
				configDir: tmpRoot,
				registerFileRoot: (ns, abs) => registered.push({ ns, abs }),
			}),
		).resolves.toBeUndefined();
		expect(registered).toHaveLength(0);
	});
});
