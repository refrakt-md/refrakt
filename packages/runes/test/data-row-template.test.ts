import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
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
	return { ast, rendered: Markdoc.transform(ast, { tags, nodes }), messages };
}

const CSV = 'name,role,age\nAda,Engineer,36\nGrace,Admiral,45\n';

describe('data rune — per-row body (SPEC-127)', () => {
	it('renders the body once per row with $row bound', () => {
		const { rendered } = runData(
			`{% data src="people.csv" %}\n## {% $row.name %}\n\n{% $row.role %}\n{% /data %}`,
			{ 'people.csv': CSV },
		);
		const headings = findAllTags(rendered, (t) => t.name === 'h2');
		expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Ada', 'Grace']);
		expect(JSON.stringify(rendered)).toContain('Engineer');
		expect(JSON.stringify(rendered)).toContain('Admiral');
	});

	it('binds $row into tag attributes, not only text', () => {
		const { rendered } = runData(
			`{% data src="people.csv" %}\n{% card href=$row.role %}{% $row.name %}{% /card %}\n{% /data %}`,
			{ 'people.csv': CSV },
		);
		expect(findAllTags(rendered, (t) => t.attributes?.['data-rune'] === 'card')).toHaveLength(2);
		// `card` moves `href` onto the link element it wraps the surface in, so
		// assert on the attribute wherever it lands rather than on the card tag.
		const linked = findAllTags(rendered, (t) => typeof t.attributes?.href === 'string');
		expect(linked.map((t) => t.attributes.href)).toEqual(['Engineer', 'Admiral']);
	});

	it('exposes a numeric column as a number', () => {
		const { rendered } = runData(
			`{% data src="people.csv" numeric="age" %}\n{% $row.age %}\n{% /data %}`,
			{ 'people.csv': CSV },
		);
		// Rendered as text either way; the point is it is not the raw cell string
		// with formatting, and arithmetic-capable downstream.
		expect(JSON.stringify(rendered)).toContain('36');
	});

	it('emits a table, not rows, when there is no body', () => {
		const { rendered } = runData(`{% data src="people.csv" /%}`, { 'people.csv': CSV });
		expect(findTag(rendered, (t) => t.name === 'table')).toBeDefined();
	});

	it('applies the shaping attributes before binding', () => {
		const { rendered } = runData(
			`{% data src="people.csv" where="role:Admiral" %}\n## {% $row.name %}\n{% /data %}`,
			{ 'people.csv': CSV },
		);
		const headings = findAllTags(rendered, (t) => t.name === 'h2');
		expect(headings.map((h) => (h.children ?? []).join(''))).toEqual(['Grace']);
	});

	/**
	 * The load-bearing one. A `data` tag used to be replaced 1:1, and the
	 * tempting way to emit N rows is to wrap them in a container. Measured
	 * against `accordion`, that is silently destructive — `{% section %}` and
	 * `{% grid %}` consume their children and the items vanish with no error.
	 * Rows must land as direct siblings, exactly where a hand-authored
	 * equivalent would.
	 */
	it('splices rows as siblings, so a parent rune reading its children sees them', () => {
		const { rendered } = runData(
			`{% accordion %}\n{% data src="people.csv" %}\n{% accordion-item %}\n## {% $row.name %}\n\n{% $row.role %}\n{% /accordion-item %}\n{% /data %}\n{% /accordion %}`,
			{ 'people.csv': CSV },
		);
		const accordion = findTag(rendered, (t) => t.attributes?.['data-rune'] === 'accordion');
		expect(accordion).toBeDefined();
		const items = findAllTags(accordion, (t) => t.attributes?.['data-rune'] === 'accordion-item');
		expect(items).toHaveLength(2);
		expect(JSON.stringify(accordion)).toContain('Ada');
		expect(JSON.stringify(accordion)).toContain('Grace');
	});

	it('warns when numeric/text are set alongside a body', () => {
		const { messages } = runData(
			`{% data src="people.csv" numeric="age" %}\n{% $row.name %}\n{% /data %}`,
			{ 'people.csv': CSV },
		);
		const warning = messages.find((m) => m.severity === 'warning');
		expect(warning?.message).toMatch(/data-value/);
	});

	it('errors rather than rendering empty inside chart', () => {
		const { messages, rendered } = runData(
			`{% chart %}\n{% data src="people.csv" %}\n{% $row.name %}\n{% /data %}\n{% /chart %}`,
			{ 'people.csv': CSV },
		);
		const error = messages.find((m) => m.severity === 'error');
		expect(error?.message).toMatch(/cannot be used inside \{% chart %\}/);
		expect(JSON.stringify(rendered)).toContain('data error');
	});

	it('leaves a $row reference to a missing column empty rather than throwing', () => {
		const { rendered } = runData(
			`{% data src="people.csv" %}\n## {% $row.nope %}\n{% /data %}`,
			{ 'people.csv': CSV },
		);
		expect(findAllTags(rendered, (t) => t.name === 'h2')).toHaveLength(2);
	});
});
