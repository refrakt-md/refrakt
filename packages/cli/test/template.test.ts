import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';
import { applyTemplateSite } from '../src/commands/template.js';

const cleanup: string[] = [];
afterEach(() => { for (const d of cleanup) rmSync(d, { recursive: true, force: true }); cleanup.length = 0; });

function makeTemplate(): string {
	const dir = mkdtempSync(join(tmpdir(), 'rf-tpl-'));
	cleanup.push(dir);
	mkdirSync(join(dir, 'content'), { recursive: true });
	writeFileSync(join(dir, 'content', 'index.md'), '# hi\n');
	writeFileSync(join(dir, 'template.json'), JSON.stringify({
		kind: 'site',
		refrakt: '>=0.24 <0.26',
		site: {
			theme: { package: '@refrakt-md/lumina' },
			plugins: ['@refrakt-md/docs'],
			routeRules: [{ pattern: '**', layout: 'docs' }],
		},
	}));
	return dir;
}

describe('applyTemplateSite — add a new site (SPEC-110 §4 kind:site)', () => {
	it('adds a site, derives the content dir, copies content, returns deps', () => {
		const tpl = makeTemplate();
		const root = mkdtempSync(join(tmpdir(), 'rf-proj-'));
		cleanup.push(root);
		const raw: RefraktConfig = { site: { contentDir: './content', theme: '@refrakt-md/lumina' } } as RefraktConfig;

		const { deps } = applyTemplateSite(raw, tpl, 'blog', root);

		// Singular → plural migration + new site under sites/blog.
		expect(raw.site).toBeUndefined();
		expect(Object.keys(raw.sites!)).toEqual(['default', 'blog']);
		const blog = raw.sites!.blog;
		expect(blog.contentDir).toBe('sites/blog/content');
		expect(blog.plugins).toContain('@refrakt-md/docs');
		expect((blog.routeRules as { layout: string }[])[0].layout).toBe('docs');

		// Content copied to the derived destination.
		expect(existsSync(join(root, 'sites', 'blog', 'content', 'index.md'))).toBe(true);

		// Derived deps = plugins + theme package.
		expect(deps).toContain('@refrakt-md/docs');
		expect(deps).toContain('@refrakt-md/lumina');
	});

	it('rejects a non-site kind', () => {
		const dir = mkdtempSync(join(tmpdir(), 'rf-tpl-'));
		cleanup.push(dir);
		mkdirSync(join(dir, 'content'), { recursive: true });
		writeFileSync(join(dir, 'template.json'), JSON.stringify({ kind: 'section', site: {} }));
		const root = mkdtempSync(join(tmpdir(), 'rf-proj-'));
		cleanup.push(root);
		const raw = { sites: { default: { contentDir: './content', theme: 'x' } } } as unknown as RefraktConfig;
		expect(() => applyTemplateSite(raw, dir, 'blog', root)).toThrow(/only "site" templates/);
	});
});
