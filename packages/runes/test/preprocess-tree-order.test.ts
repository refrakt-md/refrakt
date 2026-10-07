import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import { tags, nodes, createCorePipelineHooks } from '../src/index.js';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { findAllTags } from './helpers.js';
import type { PreprocessContext } from '@refrakt-md/types';

/**
 * Preprocessors resolve in tree order (SPEC-141): a producer's output is
 * resolved where it lands, whichever rune produced it. Driven through the core
 * pipeline hook — the entry point a build uses — so these hold however the
 * walk is implemented.
 */
function run(
	src: string,
	opts: {
		files?: Record<string, string>;
		partials?: Record<string, string>;
		hooks?: ReturnType<typeof createCorePipelineHooks>;
	} = {},
) {
	const partials: Record<string, unknown> = {};
	for (const [name, raw] of Object.entries(opts.partials ?? {})) {
		partials[name] = Markdoc.parse(raw);
	}
	let ast = Markdoc.parse(src);
	const messages: Array<{ severity: string; message: string }> = [];
	const ctx: PreprocessContext = {
		info: (m) => messages.push({ severity: 'info', message: m }),
		warn: (m) => messages.push({ severity: 'warning', message: m }),
		error: (m) => messages.push({ severity: 'error', message: m }),
		projectRoot: '/project',
		sandbox: memoryProjectFiles(new Map(Object.entries(opts.files ?? {}))),
		variables: {},
		partials,
	};
	const page = { url: '/page', relativePath: 'page.md', filePath: '/project/page.md' };
	const hooks = opts.hooks ?? createCorePipelineHooks();
	const next = hooks.preprocess!(ast, page, ctx);
	if (next) ast = next as Node;
	return {
		ast,
		messages,
		errors: messages.filter((m) => m.severity === 'error').map((m) => m.message),
		rendered: Markdoc.transform(ast, { tags, nodes, partials }),
	};
}

/** Every `fence` node in an AST, in document order. */
function fences(node: Node): Node[] {
	const out: Node[] = [];
	const visit = (n: Node) => {
		if (n.type === 'fence') out.push(n);
		for (const c of n.children ?? []) visit(c);
	};
	visit(node);
	return out;
}

const FILES = {
	'files.csv': 'path\nsrc/a.ts\nsrc/b.ts\n',
	'src/a.ts': 'export const a = 1;\n',
	'src/b.ts': 'export const b = 2;\n',
};

describe('preprocessors resolve in tree order (SPEC-141)', () => {
	it('resolves a snippet in a data row template against the bound row (BUG-027)', () => {
		const { ast, errors } = run(
			'{% data src="files.csv" %}\n{% snippet path=$row.path /%}\n{% /data %}\n',
			{
				files: FILES,
			},
		);
		expect(errors).toEqual([]);
		const out = fences(ast);
		expect(out.map((f) => f.attributes.source)).toEqual(['src/a.ts', 'src/b.ts']);
		expect(out.map((f) => f.attributes.content)).toEqual([
			'export const a = 1;\n',
			'export const b = 2;\n',
		]);
	});

	it('resolves an include in a data row template against the bound row', () => {
		const { rendered, errors } = run(
			'{% data src="people.csv" %}\n{% include file=$row.card /%}\n{% /data %}\n',
			{
				files: { 'people.csv': 'card\nada.md\ngrace.md\n' },
				partials: { 'ada.md': '## Ada\n', 'grace.md': '## Grace\n' },
			},
		);
		expect(errors).toEqual([]);
		const headings = findAllTags(rendered, (t) => t.name === 'h2');
		expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Ada', 'Grace']);
	});

	it('resolves a snippet in a data row template inside an included file', () => {
		const { ast, errors } = run('{% include file="list.md" /%}', {
			files: FILES,
			partials: {
				'list.md': '{% data src="files.csv" %}\n{% snippet path=$row.path /%}\n{% /data %}\n',
			},
		});
		expect(errors).toEqual([]);
		expect(fences(ast).map((f) => f.attributes.source)).toEqual(['src/a.ts', 'src/b.ts']);
	});
});
