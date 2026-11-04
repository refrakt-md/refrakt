import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { normalizeRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { loadContent } from '../src/site.js';

/**
 * SPEC-187 D7 — `$site`, the site a page is rendered for. Set once, in
 * `buildPageContentVariables`, from the site config every adapter passes on;
 * `name` is stamped by `normalizeRefraktConfig`.
 */
describe('the $site page variable', () => {
	let root: string;
	let content: string;

	beforeAll(() => {
		root = mkdtempSync(path.join(tmpdir(), 'refrakt-site-var-'));
		content = path.join(root, 'content');
		mkdirSync(content, { recursive: true });
		writeFileSync(
			path.join(content, 'index.md'),
			'---\ntitle: Home\n---\n\nSITE={% $site.name %}\n',
		);
	});
	afterAll(() => rmSync(root, { recursive: true, force: true }));

	const render = async (siteConfig?: unknown) => {
		const site = await loadContent(content, { siteConfig } as never);
		return JSON.stringify(site.pages[0].renderable);
	};

	it('is the name of the site the config resolved', async () => {
		const config = normalizeRefraktConfig({
			sites: {
				main: { contentDir: './content', theme: '@refrakt-md/lumina' },
				staging: { contentDir: './content', theme: '@refrakt-md/lumina' },
			},
		});
		expect(await render(resolveSite(config, 'staging').site)).toContain('"SITE=","staging"');
		expect(await render(resolveSite(config, 'main').site)).toContain('"SITE=","main"');
	});

	it('is absent without a site config', async () => {
		expect(await render()).toContain('"SITE=",null');
	});
});
