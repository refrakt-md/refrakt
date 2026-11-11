import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createDataFile } from '../src/data.js';
import { localizeCssImports } from '../src/plugin.js';

const FIXTURE = resolve(__dirname, 'fixtures/site');

describe('createDataFile', () => {
	it('renders runes through the identity transform, with plugins from the config', async () => {
		const manifest = JSON.parse(
			readFileSync(require.resolve('@refrakt-md/lumina/manifest'), 'utf8'),
		);
		const { layouts } = await import('@refrakt-md/lumina/layouts');
		const load = createDataFile({
			theme: { manifest, layouts },
			configPath: join(FIXTURE, 'refrakt.config.json'),
		});
		const home = (await load()).find((p) => p.url === '/')!;
		// The identity transform adds BEM classes; without it a rune is a bare data-rune element.
		expect(home.html).toContain('class="rf-hint');
		// `cta` comes from the marketing plugin listed in the config.
		expect(home.html).toContain('data-rune="cta"');
		expect(home.html).not.toContain('{% cta');
		// Code is highlighted.
		expect(home.html).toMatch(/<code[^>]*>.*<span/s);
		expect(typeof home.highlightCss).toBe('string');
	});
});

describe('localizeCssImports', () => {
	it('copies a bare-imported package beside the stylesheet and points the import at it', () => {
		// Inside the package, so `@refrakt-md/skeleton` resolves as it would for a site.
		const dir = mkdtempSync(join(__dirname, '.tmp-css-'));
		const css = join(dir, 'index.css');
		writeFileSync(css, '@import "@refrakt-md/skeleton";\n@import "./tokens/base.css";\n');
		const copies: Record<string, string>[] = [];
		const out = localizeCssImports(css, '/css', {
			addPassthroughCopy: (m: Record<string, string>) => copies.push(m),
		});
		const rewritten = readFileSync(out, 'utf8');
		expect(rewritten).toContain('@import "./skeleton/index.css";');
		expect(rewritten).toContain('@import "./tokens/base.css";');
		const targets = copies.flatMap((m) => Object.values(m));
		expect(targets).toContain('/css/skeleton/index.css');
		expect(targets).toContain('/css/skeleton/styles');
		rmSync(dir, { recursive: true, force: true });
	});

	it('leaves a stylesheet with no bare imports as it is', () => {
		const dir = mkdtempSync(join(tmpdir(), 'refrakt-eleventy-css-'));
		const css = join(dir, 'plain.css');
		writeFileSync(css, '@import "./a.css";\n');
		expect(localizeCssImports(css, '/css', { addPassthroughCopy: () => {} })).toBe(css);
	});
});
