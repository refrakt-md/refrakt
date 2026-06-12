import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flattenCssImports, renderGalleryDocument, type GalleryCell } from '../src/lib/gallery.js';

describe('flattenCssImports', () => {
	let dir: string;
	beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'refrakt-gallery-')); });
	afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

	it('inlines relative @imports recursively into one string', () => {
		writeFileSync(join(dir, 'a.css'), 'a { color: red; }');
		writeFileSync(join(dir, 'b.css'), "@import './a.css';\nb { color: blue; }");
		writeFileSync(join(dir, 'index.css'), "@import './b.css';\nc { color: green; }");
		const out = flattenCssImports(join(dir, 'index.css'));
		expect(out).toContain('a { color: red; }');
		expect(out).toContain('b { color: blue; }');
		expect(out).toContain('c { color: green; }');
		expect(out).not.toContain('@import');
	});

	it('leaves remote (non-relative) imports untouched', () => {
		writeFileSync(join(dir, 'index.css'), "@import 'https://example.com/x.css';\na { color: red; }");
		const out = flattenCssImports(join(dir, 'index.css'));
		expect(out).toContain("@import 'https://example.com/x.css';");
	});

	it('is cycle-safe', () => {
		writeFileSync(join(dir, 'a.css'), "@import './b.css';\na {}");
		writeFileSync(join(dir, 'b.css'), "@import './a.css';\nb {}");
		const out = flattenCssImports(join(dir, 'a.css'));
		expect(out).toContain('a {}');
		expect(out).toContain('b {}');
	});
});

describe('renderGalleryDocument', () => {
	const cells: GalleryCell[] = [
		{ rune: 'hint', variant: 'default', html: '<div class="rf-hint">x</div>' },
		{ rune: 'hint', variant: 'type-warning', html: '<div class="rf-hint rf-hint--warning">y</div>' },
		{ rune: 'card', variant: 'default', html: '<div class="rf-card">z</div>' },
	];

	it('emits a stable per-variant data-gallery-cell anchor', () => {
		const doc = renderGalleryDocument({ mode: 'light', themeCss: ':root{}', cells });
		expect(doc).toContain('data-gallery-cell="hint--default"');
		expect(doc).toContain('data-gallery-cell="hint--type-warning"');
		expect(doc).toContain('data-gallery-cell="card--default"');
	});

	it('groups cells by rune', () => {
		const doc = renderGalleryDocument({ mode: 'light', themeCss: ':root{}', cells });
		expect((doc.match(/data-gallery-rune="hint"/g) ?? []).length).toBe(1);
		expect((doc.match(/data-gallery-rune="card"/g) ?? []).length).toBe(1);
	});

	it('sets the dark mode attribute only for dark', () => {
		expect(renderGalleryDocument({ mode: 'dark', themeCss: '', cells })).toContain('<html lang="en" data-theme="dark">');
		expect(renderGalleryDocument({ mode: 'light', themeCss: '', cells })).toContain('<html lang="en">');
	});

	it('inlines the theme CSS and disables animation for stable screenshots', () => {
		const doc = renderGalleryDocument({ mode: 'light', themeCss: ':root{--rf-color-text:#000}', cells });
		expect(doc).toContain('--rf-color-text:#000');
		expect(doc).toContain('animation-duration: 0s !important');
	});

	it('is deterministic for the same input', () => {
		const a = renderGalleryDocument({ mode: 'light', themeCss: ':root{}', cells });
		const b = renderGalleryDocument({ mode: 'light', themeCss: ':root{}', cells });
		expect(a).toBe(b);
	});
});
