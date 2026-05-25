import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { planPipelineHooks } from '../src/pipeline.js';
import type { EntityRegistration, EntityRegistry } from '@refrakt-md/types';

let root: string;

function makeRegistry() {
	const entries: EntityRegistration[] = [];
	return {
		entries,
		registry: {
			register(e: EntityRegistration) { entries.push(e); },
			getAll: (t: string) => entries.filter((e) => e.type === t),
			getById: (t: string, id: string) => entries.find((e) => e.type === t && e.id === id),
			getByUrl: () => [],
			getTypes: () => [...new Set(entries.map((e) => e.type))],
		} as EntityRegistry,
	};
}

const ctx = { info() {}, warn() {}, error() {} };

beforeEach(() => {
	root = join(tmpdir(), `refrakt-plan-embed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	mkdirSync(join(root, 'plan', 'specs'), { recursive: true });
	mkdirSync(join(root, 'plan', 'work'), { recursive: true });
	mkdirSync(join(root, 'plan', 'milestones'), { recursive: true });
	writeFileSync(join(root, 'plan', 'specs', 'SPEC-001-foo.md'), `{% spec id="SPEC-001" status="accepted" %}\n\n# Foo spec\n\nBody.\n\n{% /spec %}\n`);
	writeFileSync(join(root, 'plan', 'work', 'WORK-001-bar.md'), `{% work id="WORK-001" status="ready" %}\n\n# Bar work\n\n## Acceptance Criteria\n- [ ] one\n\n{% /work %}\n`);
	writeFileSync(join(root, 'plan', 'milestones', 'v1.0.0.md'), `{% milestone name="v1.0.0" status="planning" %}\n\n# v1.0.0\n\n- Goal\n\n{% /milestone %}\n`);
});

afterEach(() => {
	try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('plan entity embeddability (WORK-270)', () => {
	it('registers spec/work/milestone with sourceFile + a working extract', async () => {
		await planPipelineHooks.configure!({ config: { plan: { dir: 'plan' } }, configDir: root } as never);
		const { entries, registry } = makeRegistry();
		planPipelineHooks.register!([], registry, ctx as never);

		for (const type of ['spec', 'work', 'milestone']) {
			const e = entries.find((x) => x.type === type);
			expect(e, `expected a ${type} entity`).toBeDefined();
			expect(e!.sourceFile, `${type} sourceFile`).toBeTruthy();
			expect(typeof e!.extract, `${type} extract`).toBe('function');

			// The extractor returns the entity's top-level rune node from a re-parse.
			const parsed = Markdoc.parse(
				`{% ${type} ${type === 'milestone' ? `name="${e!.id}"` : `id="${e!.id}"`} %}\n\nx\n\n{% /${type} %}\n`,
			);
			const node = e!.extract!(parsed);
			expect(node, `${type} extract result`).not.toBeNull();
			expect((node as { tag?: string }).tag).toBe(type);
		}
	});
});
