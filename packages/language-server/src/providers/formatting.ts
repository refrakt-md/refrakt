import type { DocumentFormattingParams, TextDocuments, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { formatIndentation } from '@refrakt-md/runes';

/**
 * Document formatting — `refrakt format`'s rule (SPEC-170 D5, WORK-657), so an
 * editor that formats on save indents nested runes as the CLI and CI expect.
 *
 * The formatter changes only leading whitespace and never the line count, so
 * the edits are per line and touch only the indentation: the cursor and the
 * rest of each line stay where they are. A document the formatter refuses,
 * because re-indenting would change its parse, gets no edits.
 */
export function provideFormatting(
	params: DocumentFormattingParams,
	documents: TextDocuments<TextDocument>,
): TextEdit[] {
	const document = documents.get(params.textDocument.uri);
	if (!document) return [];
	return formattingEdits(document.getText());
}

/** The edits that turn `text` into its formatted form. */
export function formattingEdits(text: string): TextEdit[] {
	const result = formatIndentation(text);
	if (!result.changed) return [];
	const before = text.split(/\r?\n/);
	const after = result.output.split(/\r?\n/);
	const edits: TextEdit[] = [];
	for (let line = 0; line < before.length; line++) {
		if (before[line] === after[line]) continue;
		const oldIndent = /^[ \t]*/.exec(before[line])![0];
		const newIndent = /^[ \t]*/.exec(after[line])![0];
		edits.push({
			range: { start: { line, character: 0 }, end: { line, character: oldIndent.length } },
			newText: newIndent,
		});
	}
	return edits;
}
