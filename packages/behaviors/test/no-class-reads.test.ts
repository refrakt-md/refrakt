import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * SPEC-196 D6 — behaviour scripts and components select by attribute only.
 *
 * Classes are the theme's: a theme may change the prefix, map them to other
 * names, or apply none at all. So nothing in `@refrakt-md/behaviors` or the
 * Svelte components may find an element by class, and no behaviour may write a
 * class onto an element it did not create (under a theme without classes, that
 * would put classes back; under a mapping table it would write junk).
 *
 * Both checks read source, as the `Markdoc.parse` guard does. They match
 * string literals, which is how every selector here is written.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SOURCE_DIRS = [join(ROOT, 'packages/behaviors/src'), join(ROOT, 'packages/svelte/src')];

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
		else if (/\.(ts|svelte)$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
	}
	return out;
}

const files = SOURCE_DIRS.flatMap(sourceFiles).map((path) => ({
	path: relative(ROOT, path),
	lines: readFileSync(path, 'utf-8').split('\n'),
}));

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe('behaviours and components select by attribute (SPEC-196 D6)', () => {
	it('passes no class selector to querySelector, closest or matches', () => {
		const call =
			/\.(querySelector|querySelectorAll|closest|matches)\s*(?:<[^>]*>)?\(\s*(['"`])((?:(?!\2).)*)\2/g;
		const found: string[] = [];
		for (const { path, lines } of files) {
			lines.forEach((line, i) => {
				if (isComment(line)) return;
				for (const m of line.matchAll(call)) {
					if (/(^|[\s,>+~(])\.[A-Za-z_-]/.test(m[3])) found.push(`${path}:${i + 1}  ${m[0]}`);
				}
			});
		}
		expect(found, 'Select by data-name, data-rune or another attribute').toEqual([]);
	});

	it('reads no class off an element', () => {
		const read = /\.(classList\.contains|getElementsByClassName)\(|\.className\s*(\.|\)|;|,|$)/;
		const found: string[] = [];
		for (const { path, lines } of files) {
			lines.forEach((line, i) => {
				if (!isComment(line) && read.test(line)) found.push(`${path}:${i + 1}  ${line.trim()}`);
			});
		}
		expect(found, 'Read an attribute (data-state, data-name) instead of a class').toEqual([]);
	});

	it('writes a class only on an element the behaviour created', () => {
		// The written element's root expression: `btn`, `this.playBtn`, `steps[i]` → `steps`.
		const write =
			/((?:this\.)?[A-Za-z_$][\w$]*)(?:\[[^\]]*\])?\.(?:className\s*=(?!=)|classList\.(?:add|remove|toggle)\()/g;
		// Not behaviour code: `document.body` in a script string a sandbox writes into its
		// iframe's own document.
		const allowed = new Set(['packages/behaviors/src/elements/sandbox.ts:body']);
		const found: string[] = [];
		for (const { path, lines } of files) {
			const text = lines.join('\n');
			lines.forEach((line, i) => {
				if (isComment(line)) return;
				for (const m of line.matchAll(write)) {
					const root = m[1];
					if (allowed.has(`${path}:${root}`)) continue;
					const name = root.replace(/^this\./, '');
					const created = new RegExp(
						`(?:this\\.)?\\b${name.replace(/\$/g, '\\$')}\\s*=\\s*(?:document|doc)\\.createElement\\(`,
					);
					if (!created.test(text)) found.push(`${path}:${i + 1}  ${m[0]}`);
				}
			});
		}
		expect(found, 'Write data-state (or another attribute) on an element a rune owns').toEqual([]);
	});
});
