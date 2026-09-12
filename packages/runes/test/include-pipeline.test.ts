import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { preprocessIncludes, MAX_INCLUDE_DEPTH } from '../src/include-pipeline.js';
import { preprocessData } from '../src/data-pipeline.js';
import { preprocessSnippets } from '../src/snippet-pipeline.js';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { findTag, findAllTags } from './helpers.js';
import type { PreprocessContext } from '@refrakt-md/types';

/**
 * Run the core preprocess phase in its real order — include, then snippet, then
 * data — over a page, with a set of partials and a set of project files.
 *
 * `variables` defaults to empty on purpose: several assertions below turn on a
 * value having reached a preprocessor attribute *from the include* and not from
 * the page's variable surface, and an empty surface is the only way to tell.
 */
function run(
	src: string,
	opts: {
		partials?: Record<string, string>;
		/** A partial map shared across calls — how a real build works, where the
		 *  ASTs are parsed once and every page that references one gets the same
		 *  node objects. */
		parsed?: Record<string, unknown>;
		files?: Record<string, string>;
		variables?: Record<string, unknown>;
	} = {},
) {
	const parsedPartials: Record<string, unknown> = opts.parsed ?? {};
	for (const [name, raw] of Object.entries(opts.partials ?? {})) {
		parsedPartials[name] = Markdoc.parse(raw);
	}
	const ast = Markdoc.parse(src);
	const messages: Array<{ severity: string; message: string }> = [];
	const ctx: PreprocessContext = {
		info: (m) => messages.push({ severity: 'info', message: m }),
		warn: (m) => messages.push({ severity: 'warning', message: m }),
		error: (m) => messages.push({ severity: 'error', message: m }),
		projectRoot: '/project',
		sandbox: memoryProjectFiles(new Map(Object.entries(opts.files ?? {}))),
		variables: opts.variables ?? {},
		partials: parsedPartials,
	};
	const page = { url: '/page', relativePath: 'page.md', filePath: '/project/page.md' };
	preprocessIncludes(ast, page, ctx);
	preprocessSnippets(ast, page, ctx);
	preprocessData(ast, page, ctx);
	return {
		ast,
		rendered: Markdoc.transform(ast, { tags, nodes, partials: parsedPartials }),
		messages,
		errors: messages.filter((m) => m.severity === 'error').map((m) => m.message),
	};
}

const PEOPLE = 'name,role\nAda,Engineer\nGrace,Admiral\n';

describe('include rune (SPEC-129)', () => {
	it('pastes the file\'s AST into the page', () => {
		const { rendered } = run('{% include file="intro.md" /%}', {
			partials: { 'intro.md': '## Shared heading\n\nShared body.\n' },
		});
		const h2 = findTag(rendered, (t) => t.name === 'h2');
		expect(h2).toBeDefined();
		expect(JSON.stringify(rendered)).toContain('Shared body.');
	});

	describe('the case partial cannot serve', () => {
		it('resolves a {% data %} inside the included file', () => {
			const { rendered, errors } = run('{% include file="rows.md" /%}', {
				partials: { 'rows.md': '{% data src="people.csv" %}\n## {% $row.name %}\n{% /data %}\n' },
				files: { 'people.csv': PEOPLE },
			});
			expect(errors).toEqual([]);
			const headings = findAllTags(rendered, (t) => t.name === 'h2');
			expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Ada', 'Grace']);
		});

		it('resolves a {% snippet %} inside the included file', () => {
			const { rendered, errors } = run('{% include file="code.md" /%}', {
				partials: { 'code.md': '{% snippet path="src/hello.ts" /%}\n' },
				files: { 'src/hello.ts': 'export const hello = 1;\n' },
			});
			expect(errors).toEqual([]);
			expect(JSON.stringify(rendered)).toContain('export const hello');
		});

		it('is the difference from {% partial %}, which leaves the tag to its throwing transform', () => {
			// The same file, the same page, the same partial map — only the call
			// site changes. This is the comparison the error message describes.
			const partials = { 'rows.md': '{% data src="people.csv" %}\n## {% $row.name %}\n{% /data %}\n' };
			const files = { 'people.csv': PEOPLE };
			expect(() => run('{% partial file="rows.md" /%}', { partials, files })).toThrow(
				/reached the transform phase unresolved/,
			);
			expect(() => run('{% include file="rows.md" /%}', { partials, files })).not.toThrow();
		});
	});

	describe('splicing', () => {
		it('splices as siblings, so a parent rune\'s content model reads the content', () => {
			// `accordion` splits on h2s. If the pasted nodes were wrapped in a
			// container the accordion would see one opaque child and produce no
			// items — SPEC-127's measured failure, silent in both cases.
			const { rendered } = run(
				'{% accordion %}\n{% include file="items.md" /%}\n{% /accordion %}',
				{ partials: { 'items.md': '## First\n\nOne.\n\n## Second\n\nTwo.\n' } },
			);
			const items = findAllTags(rendered, (t) => t.attributes?.['data-rune'] === 'accordion-item');
			expect(items).toHaveLength(2);
		});

		it('keeps the nodes around an include intact', () => {
			const { rendered } = run(
				'# Before\n\n{% include file="mid.md" /%}\n\n# After\n',
				{ partials: { 'mid.md': '## Middle\n' } },
			);
			const headings = findAllTags(rendered, (t) => t.name === 'h1' || t.name === 'h2');
			expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Before', 'Middle', 'After']);
		});

		it('does not let one page\'s resolution leak into the next page\'s copy', () => {
			// A build parses each partial once and hands every page the same node
			// objects, while the later preprocessors mutate the tree in place — so
			// include has to clone before it pastes.
			//
			// The `data` is nested inside a container on purpose. At the top level
			// the splice lands in the *page's* children array and the sharing never
			// shows; one level down it lands inside a pasted node, which is where a
			// missing clone writes the first page's result into the second page's
			// source.
			const parsed = {
				'rows.md': Markdoc.parse('{% div %}\n{% data src=$src %}\n## {% $row.name %}\n{% /data %}\n{% /div %}\n'),
			};
			const files = { 'a.csv': 'name\nAda\n', 'b.csv': 'name\nGrace\n' };
			const first = run('{% include file="rows.md" variables={src: "a.csv"} /%}', { parsed, files });
			const second = run('{% include file="rows.md" variables={src: "b.csv"} /%}', { parsed, files });
			const names = (r: ReturnType<typeof run>) =>
				findAllTags(r.rendered, (t) => t.name === 'h2').map((h) => (h.children ?? []).join(''));
			expect(first.errors).toEqual([]);
			expect(second.errors).toEqual([]);
			expect(names(first)).toEqual(['Ada']);
			expect(names(second)).toEqual(['Grace']);
		});
	});

	describe('variables', () => {
		it('substitutes a binding into text', () => {
			const { rendered } = run(
				'{% include file="greet.md" variables={who: "Ada"} /%}',
				{ partials: { 'greet.md': 'Hello {% $who %}.\n' } },
			);
			expect(JSON.stringify(rendered)).toContain('Ada');
		});

		it('reaches a {% data %} attribute with page variables deliberately empty', () => {
			// The binding is the *only* possible source of the filter: `variables`
			// on the context is `{}`, so a `$q` resolved anywhere but at paste time
			// would be empty — and an empty `where` is no filter at all, which
			// renders every row and would pass a "did Ada render?" assertion
			// (BUG-010). So assert on the row that must be *absent*.
			const { rendered, errors } = run(
				'{% include file="rows.md" variables={q: "role:Admiral"} /%}',
				{
					partials: { 'rows.md': '{% data src="people.csv" where=$q %}\n## {% $row.name %}\n{% /data %}\n' },
					files: { 'people.csv': PEOPLE },
					variables: {},
				},
			);
			expect(errors).toEqual([]);
			const headings = findAllTags(rendered, (t) => t.name === 'h2');
			expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Grace']);
		});

		it('leaves variables it does not bind for the page transform', () => {
			// A capability `partial` does not have: its scope replaces the variable
			// surface, so a partial cannot see `$page`. A paste is page content.
			const ast = Markdoc.parse('{% include file="where.md" /%}');
			const ctx: PreprocessContext = {
				info: () => {}, warn: () => {}, error: () => {},
				variables: {},
				partials: { 'where.md': Markdoc.parse('Page: {% $page.slug %}\n') },
			};
			preprocessIncludes(ast, { url: '/page', relativePath: 'page.md', filePath: '/page.md' }, ctx);
			const rendered = Markdoc.transform(ast, { tags, nodes, variables: { page: { slug: 'card' } } });
			expect(JSON.stringify(rendered)).toContain('card');
		});

		it('resolves a page variable used as a binding value', () => {
			const { rendered } = run(
				'{% include file="greet.md" variables={who: $page.slug} /%}',
				{
					partials: { 'greet.md': 'Hello {% $who %}.\n' },
					variables: { page: { slug: 'card' } },
				},
			);
			expect(JSON.stringify(rendered)).toContain('card');
		});
	});

	describe('nesting', () => {
		it('expands an include inside an included file', () => {
			const { rendered, errors } = run('{% include file="outer.md" /%}', {
				partials: {
					'outer.md': '## Outer\n\n{% include file="inner.md" /%}\n',
					'inner.md': '## Inner\n',
				},
			});
			expect(errors).toEqual([]);
			const headings = findAllTags(rendered, (t) => t.name === 'h2');
			expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Outer', 'Inner']);
		});

		it('names a direct cycle rather than overflowing the stack', () => {
			const { errors } = run('{% include file="a.md" /%}', {
				partials: { 'a.md': '{% include file="a.md" /%}\n' },
			});
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('cycle');
			expect(errors[0]).toContain('a.md → a.md');
		});

		it('names an indirect cycle by its full chain', () => {
			const { errors } = run('{% include file="a.md" /%}', {
				partials: {
					'a.md': '{% include file="b.md" /%}\n',
					'b.md': '{% include file="c.md" /%}\n',
					'c.md': '{% include file="a.md" /%}\n',
				},
			});
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('a.md → b.md → c.md → a.md');
		});

		it('bounds a deep chain of distinct files', () => {
			const partials: Record<string, string> = {};
			const depth = MAX_INCLUDE_DEPTH + 4;
			for (let i = 0; i < depth; i++) {
				partials[`f${i}.md`] = `{% include file="f${i + 1}.md" /%}\n`;
			}
			partials[`f${depth}.md`] = 'End.\n';
			const { errors } = run('{% include file="f0.md" /%}', { partials });
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain(`more than ${MAX_INCLUDE_DEPTH} deep`);
		});
	});

	describe('failures render on the page', () => {
		it('reports a missing file and lists what is available', () => {
			const { rendered, errors } = run('{% include file="nope.md" /%}', {
				partials: { 'intro.md': 'Hi.\n' },
			});
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('"nope.md" was not found');
			expect(errors[0]).toContain('Available: intro.md');
			// Visible on the page, not only in the build log.
			expect(JSON.stringify(rendered)).toContain('include error');
		});

		it('reports a missing `file` attribute', () => {
			const { errors } = run('{% include file=$nothing /%}', { partials: { 'a.md': 'x\n' } });
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('`file` attribute is required');
		});

		it('does not take the build down on one bad include', () => {
			const { rendered } = run('# Title\n\n{% include file="nope.md" /%}\n\n## Still here\n', {
				partials: {},
			});
			const headings = findAllTags(rendered, (t) => t.name === 'h1' || t.name === 'h2');
			expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Title', 'Still here']);
		});
	});

	it('reads the same namespaced file roots partial does', () => {
		const { rendered, errors } = run('{% include file="shared:block.md" /%}', {
			partials: { 'shared:block.md': '## From a file root\n' },
		});
		expect(errors).toEqual([]);
		expect(findTag(rendered, (t) => t.name === 'h2')).toBeDefined();
	});

	it('no-ops when no partials are wired, leaving the schema to name it', () => {
		const ast = Markdoc.parse('{% include file="a.md" /%}');
		const ctx: PreprocessContext = { info: () => {}, warn: () => {}, error: () => {}, variables: {} };
		expect(preprocessIncludes(ast, { url: '/p', relativePath: 'p.md', filePath: '/p.md' }, ctx))
			.toBeUndefined();
		expect(() => Markdoc.transform(ast, { tags, nodes })).toThrow(/preprocess hook was not wired/);
	});
});
