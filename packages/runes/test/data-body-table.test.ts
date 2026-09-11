import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { preprocessData } from '../src/data-pipeline.js';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { findTag, findAllTags } from './helpers.js';
import type { PreprocessContext } from '@refrakt-md/types';

function runData(src: string, files: Record<string, string>) {
	const ast = Markdoc.parse(src);
	const messages: Array<{ severity: string; message: string }> = [];
	const ctx: PreprocessContext = {
		info: (m) => messages.push({ severity: 'info', message: m }),
		warn: (m) => messages.push({ severity: 'warning', message: m }),
		error: (m) => messages.push({ severity: 'error', message: m }),
		projectRoot: '/project',
		sandbox: memoryProjectFiles(new Map(Object.entries(files))),
		variables: {},
	};
	preprocessData(ast, { url: '/page', relativePath: 'page.md', filePath: '/project/page.md' }, ctx);
	return {
		rendered: Markdoc.transform(ast, { tags, nodes }),
		messages,
		errors: messages.filter((m) => m.severity === 'error').map((m) => m.message),
	};
}

const ATTRS = 'name,type,required\nhref,string,false\nsrc,string,true\n';

/** Cell text for each `tr` in the rendered table, header row excluded. */
function bodyRows(rendered: unknown): string[][] {
	return findAllTags(rendered, (t) => t.name === 'tr')
		.filter((tr) => (tr.children ?? []).some((c: any) => c?.name === 'td'))
		.map((tr) => (tr.children ?? []).map((td: any) => JSON.stringify(td)));
}

describe('data body as a table row (WORK-550)', () => {
	it('emits one row per record, with the headers it was given', () => {
		const { rendered, errors } = runData(
			'{% data src="a.csv" headers="Attribute, Type" %}\n'
			+ '{% $row.name %}\n---\n{% $row.type %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		expect(errors).toEqual([]);
		const ths = findAllTags(rendered, (t) => t.name === 'th');
		expect(ths.map((t) => (t.children ?? []).join(''))).toEqual(['Attribute', 'Type']);
		expect(bodyRows(rendered)).toHaveLength(2);
	});

	it('renders markup inside a cell — the thing a bodyless table cannot', () => {
		// The whole point: `emitTableNode` wraps cells in a bare text node, so a
		// generated table could never carry the `<code>` and `<strong>` the
		// hand-written ones it replaces use.
		const { rendered } = runData(
			'{% data src="a.csv" headers="Attribute, Type" %}\n'
			+ '{% code %}{% $row.name %}{% /code %}\n---\n**{% $row.type %}**\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		const codes = findAllTags(rendered, (t) => t.name === 'code');
		expect(codes.map((c) => (c.children ?? []).join(''))).toEqual(['href', 'src']);
		expect(findAllTags(rendered, (t) => t.name === 'strong')).toHaveLength(2);
	});

	it('evaluates {% if %} per cell, so a boolean renders as a glyph', () => {
		const { rendered } = runData(
			'{% data src="a.csv" headers="Attribute, Required" %}\n'
			+ '{% $row.name %}\n---\n{% if $row.required %}✓{% else /%}—{% /if %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		const json = JSON.stringify(rendered);
		expect(json).toContain('✓');
		expect(json).toContain('—');
		expect(json).not.toContain('true');
		expect(json).not.toContain('false');
	});

	it('errors when the cell count does not match the header count, naming both', () => {
		const { errors } = runData(
			'{% data src="a.csv" headers="A, B, C" %}\n{% $row.name %}\n---\n{% $row.type %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('3 columns');
		expect(errors[0]).toContain('2 `---`-delimited cells');
	});

	it('treats consecutive delimiters as an empty cell', () => {
		const { rendered, errors } = runData(
			'{% data src="a.csv" headers="A, B, C" %}\n{% $row.name %}\n---\n---\n{% $row.type %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		expect(errors).toEqual([]);
		expect(findAllTags(rendered, (t) => t.name === 'td')).toHaveLength(6);
	});

	it('emits the same structure a bodyless table does', () => {
		// So `chart`'s findTable, `datatable`'s lookup and the `td` node need no
		// special case for a body-built table.
		// `p` is in the list on purpose. A one-line cell parses to a paragraph, so
		// without unwrapping it renders `<td><p>href</p></td>` where a pipe table
		// gives `<td>href</td>` — a difference the tag-name counts below are the
		// only thing that catches.
		const shape = (r: unknown) => ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p']
			.map((n) => `${n}:${findAllTags(r, (t) => t.name === n).length}`);
		const body = runData(
			'{% data src="a.csv" headers="Attribute, Type" %}\n{% $row.name %}\n---\n{% $row.type %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		const bodyless = runData(
			'{% data src="a.csv" columns="name as Attribute, type as Type" /%}',
			{ 'a.csv': ATTRS },
		);
		expect(shape(body.rendered)).toEqual(shape(bodyless.rendered));
	});

	it('emits nothing at all — not a bare header row — when the filter matches nothing', () => {
		const { rendered, errors } = runData(
			'{% data src="a.csv" where="name:NOPE" headers="Attribute" %}\n{% $row.name %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		expect(errors).toEqual([]);
		expect(findTag(rendered, (t) => t.name === 'table')).toBeUndefined();
		expect(findTag(rendered, (t) => t.name === 'th')).toBeUndefined();
	});

	it('errors when `headers` is set on a bodyless tag', () => {
		// Silently ignoring it would read as a rename of `columns`.
		const { errors } = runData('{% data src="a.csv" headers="A, B" /%}', { 'a.csv': ATTRS });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('`headers`');
		expect(errors[0]).toContain('`columns`');
	});

	it('leaves a body without `headers` emitting blocks, exactly as before', () => {
		const { rendered } = runData(
			'{% data src="a.csv" %}\n## {% $row.name %}\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		expect(findTag(rendered, (t) => t.name === 'table')).toBeUndefined();
		const h2 = findAllTags(rendered, (t) => t.name === 'h2');
		expect(h2.map((h) => (h.children ?? []).join(''))).toEqual(['href', 'src']);
	});
});

describe('the code rune (WORK-551)', () => {
	it('resolves a variable backticks would render literally', () => {
		const { rendered } = runData(
			'{% data src="a.csv" limit=1 %}\n'
			+ '- rune: {% code %}{% $row.name %}{% /code %}\n'
			+ '- backticks: `{% $row.name %}`\n{% /data %}',
			{ 'a.csv': ATTRS },
		);
		const codes = findAllTags(rendered, (t) => t.name === 'code');
		const text = codes.map((c) => (c.children ?? []).join(''));
		expect(text).toContain('href');
		// The backtick span is literal by definition — this is the gap, pinned.
		expect(text).toContain('{% $row.name %}');
	});

	it('renders a `code` element, the same one a backtick span produces', () => {
		// The element is what matters: the theme's `code { … }` rule styles both,
		// so a paragraph mixing the two looks uniform. The identity transform
		// additionally adds `.rf-code`, which a theme may target but need not.
		const { rendered } = runData('{% data src="a.csv" limit=1 %}\n{% code %}x{% /code %}\n{% /data %}', { 'a.csv': ATTRS });
		const el = findTag(rendered, (t) => t.name === 'code');
		expect(el).toBeDefined();
		expect(el!.attributes?.['data-rune']).toBe('code');
	});
});
