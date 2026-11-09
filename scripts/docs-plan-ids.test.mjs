import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Published docs cite no plan entities: a reader cannot open `SPEC-080` or
 * "decision D5". An ID given as data is fine — in a code block or inline code,
 * in an example rune's attributes, inside a preview, after "e.g.", or numbered
 * 9000 and up, the range sample entities use. `extend/` may close a page with
 * one `Background:` line of links.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'site/content');
const ID = /\b(?:SPEC|WORK|BUG|ADR)-(\d+)\b|\bDecision D\d+\b/g;

function markdown(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const abs = join(dir, entry);
		if (statSync(abs).isDirectory()) out.push(...markdown(abs));
		else if (entry.endsWith('.md')) out.push(abs);
	}
	return out;
}

/** The IDs a reader would see as citations. */
export function citations(text) {
	return [...text.replace(/e\.g\.,? "?[A-Z]+-\d+"?/g, '').matchAll(ID)]
		.filter((m) => !(m[1] && Number(m[1]) >= 9000))
		.map((m) => m[0]);
}

/** A page's prose: no code, no example runes; `ref` tags outside a preview stay. */
export function prose(source) {
	return source
		.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, '')
		.replace(/`[^`\n]+`/g, '')
		.replace(/\{%\s*preview\b[\s\S]*?\{%\s*\/preview\s*%\}/g, '')
		.replace(/\{%(?!\s*ref\b)[^%]*%\}/g, '');
}

/** Drop an `extend/` page's closing `Background:` line. */
export function withoutBackground(source) {
	const lines = source.trimEnd().split('\n');
	if (/^Background:/.test(lines.at(-1) ?? '')) lines.pop();
	return lines.join('\n');
}

function strings(value, out = []) {
	if (typeof value === 'string') out.push(value);
	else if (Array.isArray(value)) for (const v of value) strings(v, out);
	else if (value && typeof value === 'object')
		for (const v of Object.values(value)) strings(v, out);
	return out;
}

const pages = (dir, transform = (s) => s) =>
	markdown(join(CONTENT, dir)).map((file) => [
		relative(CONTENT, file),
		citations(prose(transform(readFileSync(file, 'utf8')))),
	]);

describe('published docs cite no plan entities', () => {
	it('recognises a citation, and lets data through', () => {
		expect(citations(prose('Built in SPEC-080 (decision D5).'))).toEqual(['SPEC-080']);
		expect(citations(prose('See {% ref "SPEC-056" preview="drawer" /%}.'))).toEqual(['SPEC-056']);
		expect(citations(prose('Per Decision D5, first match wins.'))).toEqual(['Decision D5']);
		expect(citations(prose('```shell\nrefrakt plan update WORK-042\n```\n'))).toEqual([]);
		expect(citations(prose('Run `refrakt plan history WORK-024`.'))).toEqual([]);
		expect(citations(prose('{% expand "SPEC-066" /%}'))).toEqual([]);
		expect(citations(prose('{% preview %}\n{% ref "SPEC-078" /%}\n{% /preview %}'))).toEqual([]);
		expect(citations(prose('An id (e.g., "SPEC-008") and WORK-9001.'))).toEqual([]);
		expect(citations(withoutBackground('Text.\n\nBackground: {% ref "SPEC-080" /%}\n'))).toEqual(
			[],
		);
	});

	for (const dir of ['runes', 'docs', 'themes']) {
		it.each(pages(dir))(`${dir}: %s`, (_page, found) => expect(found).toEqual([]));
	}

	it.each(pages('extend', withoutBackground))('extend: %s', (_page, found) =>
		expect(found).toEqual([]),
	);

	it.each(
		readdirSync(join(CONTENT, '_data'))
			.filter((f) => f.endsWith('.json'))
			.map((f) => [f, JSON.parse(readFileSync(join(CONTENT, '_data', f), 'utf8'))]),
	)('_data/%s', (_file, data) => {
		expect(strings(data).flatMap(citations)).toEqual([]);
	});
});
