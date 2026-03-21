import { describe, it, expect } from 'vitest';
import { assembleFromDirectory, mergeContent, type SandboxSourceResult } from '../src/sandbox-sources.js';

/** Create a mock file system for testing */
function mockFs(files: Record<string, string>) {
	const dirs = new Map<string, string[]>();

	// Build directory listings from file paths
	for (const path of Object.keys(files)) {
		const parts = path.split('/');
		const dir = parts.slice(0, -1).join('/') || '/';
		const name = parts[parts.length - 1];
		if (!dirs.has(dir)) dirs.set(dir, []);
		dirs.get(dir)!.push(name);
	}

	return {
		readFile: (p: string): string | null => files[p] ?? null,
		listDir: (p: string): string[] => dirs.get(p) ?? [],
		dirExists: (p: string): boolean => dirs.has(p),
	};
}

describe('assembleFromDirectory', () => {
	it('should assemble HTML, CSS, and JS from a directory', () => {
		const fs = mockFs({
			'/examples/login/index.html': '<form>Login</form>',
			'/examples/login/style.css': '.form { padding: 1rem; }',
			'/examples/login/script.js': 'console.log("hello");',
		});

		const result = assembleFromDirectory('/examples/login', 'login', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
		expect(result.content).toContain('data-source="HTML"');
		expect(result.content).toContain('<form>Login</form>');
		expect(result.content).toContain('data-source="CSS"');
		expect(result.content).toContain('.form { padding: 1rem; }');
		expect(result.content).toContain('data-source="JavaScript"');
		expect(result.content).toContain('console.log("hello")');
	});

	it('should produce source panels with origin labels', () => {
		const fs = mockFs({
			'/examples/login/index.html': '<form>Login</form>',
			'/examples/login/style.css': '.form { padding: 1rem; }',
			'/examples/login/script.js': 'console.log("hello");',
		});

		const result = assembleFromDirectory('/examples/login', 'login', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.panels).toHaveLength(3);
		expect(result.panels[0]).toMatchObject({ label: 'HTML', language: 'html', origin: 'login/index.html' });
		expect(result.panels[1]).toMatchObject({ label: 'CSS', language: 'css', origin: 'login/style.css' });
		expect(result.panels[2]).toMatchObject({ label: 'JavaScript', language: 'javascript', origin: 'login/script.js' });
	});

	it('should concatenate multiple CSS files alphabetically', () => {
		const fs = mockFs({
			'/examples/widget/index.html': '<div>Widget</div>',
			'/examples/widget/base.css': '.base { color: red; }',
			'/examples/widget/theme.css': '.theme { color: blue; }',
		});

		const result = assembleFromDirectory('/examples/widget', 'widget', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		const cssPanel = result.panels.find(p => p.language === 'css')!;
		expect(cssPanel.content).toBe('.base { color: red; }\n.theme { color: blue; }');
		expect(cssPanel.origin).toBe('widget/base.css, widget/theme.css');
	});

	it('should concatenate multiple JS files alphabetically', () => {
		const fs = mockFs({
			'/examples/app/index.html': '<div>App</div>',
			'/examples/app/chart.js': 'function chart() {}',
			'/examples/app/interactions.js': 'function interact() {}',
		});

		const result = assembleFromDirectory('/examples/app', 'app', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		const jsPanel = result.panels.find(p => p.language === 'javascript')!;
		expect(jsPanel.content).toBe('function chart() {}\nfunction interact() {}');
	});

	it('should prefer index.html when multiple HTML files exist', () => {
		const fs = mockFs({
			'/examples/multi/about.html': '<div>About</div>',
			'/examples/multi/index.html': '<div>Index</div>',
		});

		const result = assembleFromDirectory('/examples/multi', 'multi', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('multiple .html files');
		expect(result.warnings[0]).toContain('index.html');
		expect(result.content).toContain('<div>Index</div>');
		expect(result.content).not.toContain('<div>About</div>');
	});

	it('should warn when no HTML file exists', () => {
		const fs = mockFs({
			'/examples/styles/style.css': '.foo { color: red; }',
		});

		const result = assembleFromDirectory('/examples/styles', 'styles', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('no .html file');
		expect(result.content).toContain('data-source="CSS"');
	});

	it('should error when directory does not exist', () => {
		const fs = mockFs({});

		const result = assembleFromDirectory('/examples/missing', 'missing', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toContain('not found');
		expect(result.errors[0]).toContain('missing');
		expect(result.content).toBe('');
	});

	it('should warn when directory has no recognized source files', () => {
		const fs = mockFs({
			'/examples/empty/readme.txt': 'nothing here',
		});
		// Manually set dirExists to true for the directory
		const listDir = (_p: string) => ['readme.txt'];
		const dirExists = (_p: string) => true;
		const readFile = (_p: string): string | null => null;

		const result = assembleFromDirectory('/examples/empty', 'empty', readFile, listDir, dirExists);

		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('contains no .html, .css, or .js files');
	});

	it('should inject SVG files into HTML body', () => {
		const fs = mockFs({
			'/examples/icon/index.html': '<div>Icon demo</div>',
			'/examples/icon/logo.svg': '<svg><circle r="10"/></svg>',
		});

		const result = assembleFromDirectory('/examples/icon', 'icon', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		const htmlPanel = result.panels.find(p => p.language === 'html')!;
		expect(htmlPanel.content).toContain('<div>Icon demo</div>');
		expect(htmlPanel.content).toContain('<svg><circle r="10"/></svg>');
	});

	it('should inject shaders as JS constants', () => {
		const fs = mockFs({
			'/examples/gl/index.html': '<canvas></canvas>',
			'/examples/gl/vertex.glsl-vert': 'void main() { gl_Position = vec4(0); }',
			'/examples/gl/fragment.glsl-frag': 'void main() { gl_FragColor = vec4(1); }',
			'/examples/gl/script.js': 'initGL();',
		});

		const result = assembleFromDirectory('/examples/gl', 'gl', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		const jsPanel = result.panels.find(p => p.language === 'javascript')!;
		expect(jsPanel.content).toContain('VERTEX_SHADER');
		expect(jsPanel.content).toContain('FRAGMENT_SHADER');
		expect(jsPanel.content).toContain('initGL()');
	});

	it('should handle HTML-only directory', () => {
		const fs = mockFs({
			'/examples/simple/index.html': '<p>Simple</p>',
		});

		const result = assembleFromDirectory('/examples/simple', 'simple', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		expect(result.panels).toHaveLength(1);
		expect(result.panels[0].language).toBe('html');
	});

	it('should ignore unrecognized file extensions', () => {
		const fs = mockFs({
			'/examples/mixed/index.html': '<p>Hello</p>',
			'/examples/mixed/readme.md': '# Readme',
			'/examples/mixed/data.json': '{}',
		});

		const result = assembleFromDirectory('/examples/mixed', 'mixed', fs.readFile, fs.listDir, fs.dirExists);

		expect(result.errors).toHaveLength(0);
		expect(result.panels).toHaveLength(1);
		expect(result.panels[0].language).toBe('html');
	});
});

describe('mergeContent', () => {
	it('should append inline CSS after file CSS', () => {
		const fileContent = [
			'<div data-source="HTML"><p>Hello</p></div>',
			'<style data-source="CSS">.a { color: red; }</style>',
		].join('\n');

		const inlineContent = '<style data-source="CSS">.b { color: blue; }</style>';

		const merged = mergeContent(fileContent, inlineContent);

		expect(merged).toContain('.a { color: red; }');
		expect(merged).toContain('.b { color: blue; }');
		expect(merged).toContain('data-source="HTML"');
	});

	it('should append inline JS after file JS', () => {
		const fileContent = '<script data-source="JavaScript">function a() {}</script>';
		const inlineContent = '<script data-source="JavaScript">function b() {}</script>';

		const merged = mergeContent(fileContent, inlineContent);

		expect(merged).toContain('function a() {}');
		expect(merged).toContain('function b() {}');
	});

	it('should handle when only file content has HTML', () => {
		const fileContent = '<div data-source="HTML"><p>File</p></div>';
		const inlineContent = '<style data-source="CSS">.extra { margin: 0; }</style>';

		const merged = mergeContent(fileContent, inlineContent);

		expect(merged).toContain('<p>File</p>');
		expect(merged).toContain('.extra { margin: 0; }');
	});

	it('should handle when inline overrides HTML', () => {
		const fileContent = [
			'<div data-source="HTML"><p>Original</p></div>',
			'<style data-source="CSS">.a { color: red; }</style>',
		].join('\n');

		const inlineContent = '<div data-source="HTML"><p>Override</p></div>';

		const merged = mergeContent(fileContent, inlineContent);

		expect(merged).toContain('<p>Original</p>');
		expect(merged).toContain('<p>Override</p>');
	});
});
