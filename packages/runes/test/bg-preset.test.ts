import { describe, it, expect, vi } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function parseWith(src: string, variables: Record<string, unknown>) {
	return Markdoc.transform(Markdoc.parse(src), {
		tags, nodes, variables: { generatedIds: new Set<string>(), path: '/t.md', ...variables },
	} as never);
}

function find(node: any, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean): any {
	if (!node || typeof node !== 'object') return undefined;
	if (Markdoc.Tag.isTag(node as never) && pred(node as never)) return node;
	for (const child of (node.children ?? [])) {
		const f = find(child, pred);
		if (f) return f;
	}
	return undefined;
}
function findAll(node: any, pred: (t: any) => boolean, acc: any[] = []): any[] {
	if (!node || typeof node !== 'object') return acc;
	if (Markdoc.Tag.isTag(node as never) && pred(node)) acc.push(node);
	for (const child of (node.children ?? [])) findAll(child, pred, acc);
	return acc;
}

/** Mock sandbox file readers for an external scene directory. */
function mockSandboxFs(files: Record<string, string>) {
	const dirs = new Map<string, string[]>();
	for (const path of Object.keys(files)) {
		const dir = path.split('/').slice(0, -1).join('/');
		const name = path.split('/').pop()!;
		if (!dirs.has(dir)) dirs.set(dir, []);
		dirs.get(dir)!.push(name);
	}
	return {
		__sandboxReadFile: vi.fn((p: string): string | null => files[p] ?? null),
		__sandboxListDir: (p: string): string[] => dirs.get(p) ?? [],
		__sandboxDirExists: (p: string): boolean => dirs.has(p),
		__sandboxExamplesDir: '/examples',
	};
}

// SPEC-104 / WORK-429 — a `sandbox`-typed bg preset expands at transform time
// into the WORK-428 `data-bg-guest` body: `bg="name"` ≈ an inline sandbox body.
describe('sandbox bg preset expansion (SPEC-104 §5)', () => {
	it('expands `bg="name"` (sandbox preset) into a tagged backdrop guest', () => {
		const fs = mockSandboxFs({ '/examples/midnight-waves/index.js': '// three.js scene' });
		const out = parseWith('{% card bg="midnight-waves" %}\n# T\nbody\n{% /card %}', {
			...fs,
			__backgrounds: { 'midnight-waves': { sandbox: { src: 'midnight-waves', framework: 'three', dependencies: 'three' } } },
		});
		const guest = find(out, t => t.attributes['data-bg-guest'] !== undefined);
		expect(guest, 'a backdrop guest should be expanded from the preset').toBeDefined();
		expect(guest.name).toBe('rf-sandbox');
		expect(guest.attributes['data-guest-posture']).toBe('backdrop');
		expect(guest.attributes['data-height']).toBe('fill');
		expect(guest.attributes['data-activation']).toBe('eager');
	});

	it('does not expand a non-sandbox preset (gradient-only) — just the bg-preset meta', () => {
		const out = parseWith('{% card bg="brand-fade" %}\n# T\nbody\n{% /card %}', {
			__backgrounds: { 'brand-fade': { gradient: { type: 'linear', stops: ['primary', 'surface'] } } },
		});
		expect(find(out, t => t.attributes['data-bg-guest'] !== undefined)).toBeUndefined();
		expect(find(out, t => t.name === 'meta' && t.attributes['data-field'] === 'bg-preset')).toBeDefined();
	});

	it('resolves a sandbox preset that `extends` a base scene (single level, own fields win)', () => {
		const fs = mockSandboxFs({ '/examples/base-scene/index.js': '// base' });
		const out = parseWith('{% card bg="derived" %}\n# T\n{% /card %}', {
			...fs,
			__backgrounds: {
				'base-scene': { sandbox: { src: 'base-scene', framework: 'three', dependencies: 'three' } },
				derived: { extends: 'base-scene' },
			},
		});
		const guest = find(out, t => t.attributes['data-bg-guest'] !== undefined);
		expect(guest, 'extends should resolve the base scene').toBeDefined();
		expect(guest.attributes['data-framework']).toBe('three');
	});

	it('memoises the assembled scene — the file readers run once across reuses (same config)', () => {
		const fs = mockSandboxFs({ '/examples/waves/index.js': '// scene' });
		// Two hosts naming the same scene in one document → one shared config.
		const out = parseWith(
			'{% card bg="waves" %}\n# A\n{% /card %}\n\n{% card bg="waves" %}\n# B\n{% /card %}',
			{ ...fs, __backgrounds: { waves: { sandbox: { src: 'waves' } } } },
		);
		const guests = findAll(out, t => t.attributes?.['data-bg-guest'] !== undefined);
		expect(guests.length).toBe(2); // both hosts get a backdrop
		// …but the scene's source files were read only once (the second is a cache clone).
		const reads = fs.__sandboxReadFile.mock.calls.filter(c => String(c[0]).startsWith('/examples/waves/'));
		expect(reads.length).toBeGreaterThan(0);
		const uniqueReadPaths = new Set(reads.map(c => c[0]));
		// each scene file read at most once despite two consumers
		expect(reads.length).toBe(uniqueReadPaths.size);
	});
});
