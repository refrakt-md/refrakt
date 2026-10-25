/**
 * The one way refrakt parses Markdoc source — SPEC-170 D1.
 *
 * Every parse site in `packages/` and `plugins/` calls this rather than
 * `Markdoc.parse`, so a page cannot render one way and validate, preview or
 * lint another. `test/parse.test.ts` fails on a new direct call.
 *
 * It tokenizes with `allowIndentation`: a line indented four spaces or a tab is
 * not an indented code block, so the content of a tag can be indented to show
 * its nesting. Fenced code is unaffected, including its relative indentation.
 * WORK-640 / WORK-645 measured the option against every tracked `.md` file in
 * the repository on Markdoc 0.5.10, and it changed no AST.
 */
import Markdoc from '@markdoc/markdoc';
import type { Node, ParserArgs } from '@markdoc/markdoc';

const tokenizer = new Markdoc.Tokenizer({ allowIndentation: true });

/** Parse Markdoc source to an AST, with indentation allowed. */
export function parse(source: string, args?: ParserArgs): Node {
	return Markdoc.parse(tokenizer.tokenize(source), args);
}
