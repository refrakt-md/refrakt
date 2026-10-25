import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { formatIndentation } from '@refrakt-md/runes';
import { formattingEdits } from '../src/providers/formatting.js';

/** WORK-657 — the language server formats with `refrakt format`'s function. */

const NESTED = '{% card %}\nIntro.\n{% hint %}\nx\n{% /hint %}\n{% /card %}\n';

describe('document formatting', () => {
	it('produces the same text as `refrakt format`', () => {
		const doc = TextDocument.create('file:///a.md', 'markdown', 1, NESTED);
		const formatted = TextDocument.applyEdits(doc, formattingEdits(NESTED));
		expect(formatted).toBe(formatIndentation(NESTED).output);
		expect(formatted).toBe('{% card %}\n\tIntro.\n\t{% hint %}\n\tx\n\t{% /hint %}\n{% /card %}\n');
	});

	it('edits only the indentation of the lines that change', () => {
		const edits = formattingEdits(NESTED);
		expect(edits.map((e) => e.range.start.line)).toEqual([1, 2, 3, 4]);
		for (const e of edits) {
			expect(e.range.start.character).toBe(0);
			expect(e.newText).toBe('\t');
		}
	});

	it('returns no edits for a document that already follows the rule', () => {
		expect(formattingEdits(formatIndentation(NESTED).output)).toEqual([]);
	});
});
