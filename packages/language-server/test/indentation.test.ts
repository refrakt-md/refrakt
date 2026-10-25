import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { provideDiagnostics } from '../src/providers/diagnostics.js';
import { parse } from '../src/parser/markdoc.js';

/** SPEC-170 / WORK-645 — the language server parses an indented page as the
 *  content loader does: with indentation allowed. */

const INDENTED = '{% hint type="note" %}\n\tSome hint text.\n\n\t- a list\n{% /hint %}\n';

describe('an indented page in the language server', () => {
	it('parses with no indented code block', () => {
		const types = [...parse(INDENTED).walk()].map((n) => n.type);
		expect(types).not.toContain('code');
		expect(types).toContain('list');
	});

	it('produces no diagnostics', () => {
		const doc = TextDocument.create('file:///indented.md', 'markdown', 1, INDENTED);
		expect(provideDiagnostics(doc)).toEqual([]);
	});
});
