import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CORE_TOOLS } from '../src/tools/core.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const tool = CORE_TOOLS.find((t) => t.name === 'refrakt.validate')!;

let tempDir: string;

function scaffold(config: unknown, files: Record<string, string>): void {
	const nm = join(tempDir, 'node_modules', '@refrakt-md');
	mkdirSync(nm, { recursive: true });
	for (const pkg of ['runes', 'transform', 'types', 'lumina', 'content', 'cli']) {
		try {
			symlinkSync(join(REPO_ROOT, 'packages', pkg), join(nm, pkg));
		} catch {
			// already linked
		}
	}
	writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'proj', type: 'module' }));
	writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify(config, null, 2));
	for (const [rel, body] of Object.entries(files)) {
		const abs = join(tempDir, rel);
		mkdirSync(resolve(abs, '..'), { recursive: true });
		writeFileSync(abs, body);
	}
}

const CONFIG = {
	sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (input: unknown) => tool.handler(input, { cwd: tempDir }) as Promise<any>;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-mcp-validate-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe('refrakt.validate MCP tool (SPEC-135 D6 / WORK-581)', () => {
	it('is registered with the inputs that mirror the CLI', () => {
		expect(tool).toBeDefined();
		const props = Object.keys(tool.inputSchema.properties ?? {});
		expect(props).toEqual(expect.arrayContaining(['site', 'only', 'deep']));
	});

	// D6 — the point of the tool over the CLI is that a caller can filter,
	// count and act on individual findings. A tool that returned the CLI's
	// formatted output would be a worse CLI.
	it('returns structured findings, not a rendered report', async () => {
		scaffold(CONFIG, {
			'content/index.md': '# Hi\n\n{% notarealrune %}\nx\n{% /notarealrune %}\n',
		});

		const out = await call({});

		expect(out.ok).toBe(false);
		const finding = out.sites[0].content[0];
		expect(finding).toMatchObject({
			file: expect.stringContaining('index.md'),
			severity: 'error',
			id: 'tag-undefined',
		});
		expect(typeof finding.line).toBe('number');
		// Enough location detail to open the right file at the right line
		// without guessing.
		expect(finding.url).toMatch(/^\//);
	});

	it('reports ok:true and no findings for a clean site', async () => {
		scaffold(CONFIG, { 'content/index.md': '# Hi\n\nJust prose.\n' });

		const out = await call({});

		expect(out.ok).toBe(true);
		expect(out.sites[0].content).toEqual([]);
		expect(out.sites[0].counts).toEqual({ errors: 0, warnings: 0, info: 0 });
	});

	it('carries per-site counts so a caller can act without re-tallying', async () => {
		scaffold(CONFIG, {
			'content/index.md': '# Hi\n\n{% notarealrune %}\nx\n{% /notarealrune %}\n',
		});

		const out = await call({});
		expect(out.sites[0].counts.errors).toBe(1);
	});

	it('honours `site`', async () => {
		scaffold(
			{
				sites: {
					main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
					blog: { contentDir: './blog', theme: '@refrakt-md/lumina', target: 'svelte' },
				},
			},
			{ 'content/index.md': '# Main\n', 'blog/index.md': '# Blog\n' },
		);

		const out = await call({ site: 'blog' });
		expect(out.sites).toHaveLength(1);
		expect(out.sites[0].site).toBe('blog');
	});

	it('honours `only`', async () => {
		scaffold(CONFIG, {
			'content/index.md': '# Hi\n\n{% notarealrune %}\nx\n{% /notarealrune %}\n',
		});

		const out = await call({ only: 'config' });
		expect(out.sites[0].content).toEqual([]);
		expect(out.ok).toBe(true);
	});

	it('caps findings and reports how many were dropped', async () => {
		const many = Array.from({ length: 12 }, (_, i) => `{% fake${i} %}\nx\n{% /fake${i} %}\n`).join(
			'\n',
		);
		scaffold(CONFIG, { 'content/index.md': `# Hi\n\n${many}` });

		const out = await call({ limit: 5 });
		expect(out.sites[0].content).toHaveLength(5);
		expect(out.sites[0].contentTruncated).toBe(7);
	});

	// D2 — never report success on nothing. For a tool that means an explicit
	// failure a caller can branch on, not an empty pass.
	it('returns ok:false with an error when there is no config', async () => {
		const out = await call({});
		expect(out.ok).toBe(false);
		expect(out.error).toContain('Nothing to validate');
		expect(out.sites).toEqual([]);
	});

	it('explains a suppressed content layer rather than returning it empty', async () => {
		scaffold(
			{
				sites: {
					main: {
						contentDir: './content',
						theme: '@refrakt-md/lumina',
						target: 'svelte',
						plugins: ['@refrakt-md/not-a-real-plugin'],
					},
				},
			},
			{ 'content/index.md': '# Hi\n' },
		);

		const out = await call({});
		expect(out.ok).toBe(false);
		expect(out.sites[0].contentSuppressed).toContain('skipped');
		expect(out.sites[0].config[0].message).toContain('not-a-real-plugin');
	});
});
