import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { ProjectFiles, PreprocessContext, PreprocessPage } from '@refrakt-md/types';
import { createContentModelSchema } from '../lib/index.js';
import type { AnchorOptions } from '../lib/anchor.js';
import {
	formatHighlight,
	highlightMatchLines,
	parseHighlightMatch,
	reindent,
	shouldReindent,
} from '../lib/present.js';
import { readSnippetFile, SnippetSandboxError } from '../lib/read-file.js';
import { compareMarker, parseMarker } from '../lib/review-marker.js';
import { inferLanguage } from '../lang-map.js';

const { Ast } = Markdoc;

function resolveAttributeValue(
	value: unknown,
	variables: Record<string, unknown> | undefined,
): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'object' && '$$mdtype' in (value as Record<string, unknown>)) {
		const node = value as { $$mdtype: string; path?: unknown };
		if (node.$$mdtype === 'Variable' && Array.isArray(node.path)) {
			let current: unknown = variables;
			for (const segment of node.path as string[]) {
				if (current === null || current === undefined) return '';
				current = (current as Record<string, unknown>)[segment];
			}
			return current === null || current === undefined ? '' : String(current);
		}
	}
	return '';
}

function makeErrorFence(pathAttr: string, message: string): Node {
	return new Ast.Node('fence', {
		content: `snippet error: ${message}\n`,
		language: 'text',
		source: pathAttr || '(unresolved)',
		snippet: true,
		'data-snippet-error': message,
	});
}

function resolveSnippetToFence(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
): Node {
	const pathAttr = resolveAttributeValue(tag.attributes.path, ctx.variables);
	const lines =
		tag.attributes.lines !== undefined
			? resolveAttributeValue(tag.attributes.lines, ctx.variables)
			: undefined;
	const langAttr =
		tag.attributes.lang !== undefined
			? resolveAttributeValue(tag.attributes.lang, ctx.variables)
			: undefined;
	const linenumbers = tag.attributes.linenumbers === true;
	const highlight =
		tag.attributes.highlight !== undefined
			? resolveAttributeValue(tag.attributes.highlight, ctx.variables)
			: undefined;

	const str = (name: string): string | undefined =>
		tag.attributes[name] !== undefined
			? resolveAttributeValue(tag.attributes[name], ctx.variables)
			: undefined;

	const anchor = {
		symbol: str('symbol'),
		match: str('match'),
		occurrence:
			tag.attributes.occurrence !== undefined ? Number(tag.attributes.occurrence) : undefined,
		extent: str('extent') as AnchorOptions['extent'],
		until: str('until'),
		through: str('through'),
		doc: tag.attributes.doc === undefined ? undefined : tag.attributes.doc === true,
	};
	const reindentAttr =
		tag.attributes.reindent === undefined ? undefined : tag.attributes.reindent === true;
	const highlightMatch = str('highlight-match');
	const reviewedAttr = str('reviewed');

	if (!pathAttr) {
		const msg =
			'snippet `path` attribute is required (and an unresolvable variable reference resolves to empty)';
		ctx.error(msg, page.url);
		return makeErrorFence('', msg);
	}

	let result;
	try {
		result = readSnippetFile({
			files,
			pathAttr,
			lines: lines || undefined,
			anchor,
			lang: langAttr || undefined,
			referencingPage: page.relativePath,
		});
	} catch (err) {
		if (err instanceof SnippetSandboxError) {
			ctx.error(err.message, page.url);
			return makeErrorFence(pathAttr, err.message);
		}
		const msg = (err as Error).message ?? String(err);
		ctx.error(`snippet "${pathAttr}" failed unexpectedly: ${msg}`, page.url);
		return makeErrorFence(pathAttr, msg);
	}

	for (const warning of result.warnings) {
		ctx.warn(warning, page.url);
	}

	if (reviewedAttr && reviewedAttr.length > 0) {
		const stored = parseMarker(reviewedAttr);
		const comparison = compareMarker(stored.strict, result.content, stored.loose);
		if (comparison.verdict === 'stale') {
			ctx.warn(
				`snippet \`${pathAttr}\` has changed since it was last reviewed. Re-read the prose ` +
					'around it, then run `refrakt snippet review --update` to see the diff and re-stamp.',
				page.url,
			);
		}
	}

	const language = langAttr && langAttr.length > 0 ? langAttr : inferLanguage(result.relativePath);

	// Line coordinates are fixed before `reindent`, which changes columns, not lines.
	const highlightMatchLinesFound = highlightMatch
		? highlightMatchLines(result.content, parseHighlightMatch(highlightMatch))
		: [];

	const content = shouldReindent(result.anchored, reindentAttr)
		? reindent(result.content)
		: result.content;

	const fenceAttrs: Record<string, unknown> = {
		content,
		language,
		source: result.relativePath,
		snippet: true,
	};
	if (lines) fenceAttrs.lines = lines;
	else if (result.anchored && result.start !== undefined && result.end !== undefined) {
		fenceAttrs.lines = `${result.start}-${result.end}`;
	}
	if (linenumbers) fenceAttrs.linenumbers = true;

	if (highlightMatchLinesFound.length > 0) {
		const base = result.start ?? 1;
		fenceAttrs.highlight = formatHighlight(highlightMatchLinesFound.map((n) => n + base - 1));
	} else if (highlight && highlight.length > 0) {
		fenceAttrs.highlight = highlight;
	}

	return new Ast.Node('fence', fenceAttrs);
}

function preprocessSnippet(tag: Node, page: PreprocessPage, ctx: PreprocessContext): Node | void {
	if (!ctx.sandbox) return;
	return resolveSnippetToFence(tag, page, ctx, ctx.sandbox);
}

export const snippet = createContentModelSchema({
	attributes: {
		path: {
			type: String,
			required: true,
			description:
				'Path to the source file, relative to the project root. Rejected if it escapes the root.',
		},
		lines: {
			type: String,
			required: false,
			description:
				'Line range. Formats: "10-25", "10-" (to EOF), "-20" (from start), "10" (single line). 1-indexed, inclusive. A coordinate into a file nobody promised to hold still — prefer `symbol` or `match`, which survive edits above the region. Mutually exclusive with both.',
		},
		symbol: {
			type: String,
			required: false,
			description:
				'Name a declaration instead of a line range: `symbol="SiteConfig"`. The anchor is built from the language\'s keyword table, so a symbol that moves is still found and a symbol that is renamed fails loudly instead of rendering the wrong region. Includes the doc comment by default (see `doc`).',
		},
		match: {
			type: String,
			required: false,
			description:
				'Raw regex anchor, applied per line: `match="^\\\\.rf-hint\\\\s*\\\\{"`. The general form — `symbol` is sugar over it — and the way to address a language whose keywords the table does not carry.',
		},
		occurrence: {
			type: Number,
			required: false,
			description:
				'Which match to take when the anchor is ambiguous, 1-based. An escape hatch, not a naming form: it is a better coordinate than a line number, but it still drifts when another match is inserted above the one addressed. Prefer a more specific `match=`. Out of range refuses rather than clamping.',
		},
		extent: {
			type: String,
			required: false,
			matches: ['auto', 'dedent', 'section', 'paired'],
			description:
				"How far the slice runs. `auto` (default) balances delimiters — TS, CSS, JSON. `dedent` consumes lines indented deeper than the anchor — Python, YAML. `section` runs to the next sibling at the anchor's own level — Markdown headings, TOML tables. `paired` balances a token pair — Markdoc, HTML, Svelte. Never inferred from the file.",
		},
		until: {
			type: String,
			required: false,
			description:
				'Regex ending the extent, excluding the matching line. Overrides `extent`. Refuses if it never matches rather than returning the rest of the file.',
		},
		through: {
			type: String,
			required: false,
			description:
				'As `until`, but including the matching line. Two attributes rather than one flag because `until="^}"` in code wants the brace in and `until="^## "` in Markdown wants the heading out — either default is silently wrong half the time.',
		},
		doc: {
			type: Boolean,
			required: false,
			description:
				'Include the preceding doc comment. Defaults on for `symbol` (which names an entity and delegates the boundary) and off for `match` (which names a line the author already chose). Annotations and decorators attach regardless.',
		},
		reindent: {
			type: Boolean,
			required: false,
			description:
				"Strip the slice's common leading whitespace, so a nested target does not render with a ragged left edge. Defaults on for `symbol`/`match` and off for `lines`, so no existing line-addressed invocation changes how it renders. Relative structure is preserved, so a dedented Python method stays valid.",
		},
		reviewed: {
			type: String,
			required: false,
			description:
				'Records that a human read this version of the slice and confirmed the prose around it matched. Freezes nothing — the snippet still tracks HEAD and re-resolves every build. When the slice changes, a diagnostic asks for a re-read; the page still renders the current code. Written by `refrakt snippet review`, never by hand.',
		},
		'highlight-match': {
			type: String,
			required: false,
			description:
				'Comma-separated regexes; lines matching any of them are emphasized. The anchor-native form of `highlight` — under an anchor the author never saw a line number, so content is the only thing they can point at.',
		},
		lang: {
			type: String,
			required: false,
			description: 'Syntax-highlighting language hint. Overrides the extension-based inference.',
		},
		linenumbers: {
			type: Boolean,
			required: false,
			description:
				'Show line numbers in the gutter. Starting number derives from the `lines` range start (e.g. lines="74-125" → first line is 74), so numbers reflect the file\'s real offsets.',
		},
		highlight: {
			type: String,
			required: false,
			description:
				'Range(s) to emphasize without cropping — Shiki-style format: "74-78", "74-78,82,90-92". Indices are file coordinates (same frame as `lines=`), and stay so under an anchor. Note that a *numeric* highlight under `symbol`/`match` carries the same coordinate exposure anchoring otherwise removes — the resolver chose the region, so the author is guessing at its line numbers. Use `highlight-match` there.',
		},
	},
	contentModel: { type: 'sequence', fields: [] },
	preprocess: preprocessSnippet,
	transform(_resolved, _attrs) {
		throw new Error(
			'{% snippet %} reached the transform phase unresolved.\n\n' +
				'If this file is pulled in with {% partial %}: use {% include %} instead. ' +
				'Markdoc expands partials during the transform, which is after the preprocess ' +
				'phase that resolves `snippet` — so a `snippet` tag inside a partial never gets ' +
				'read. {% include file="..." /%} pastes the file before preprocess, so `snippet` ' +
				'and `data` inside it resolve. Both runes read the same `_partials/` directory ' +
				'and file roots, so only the call site changes.\n\n' +
				'If you are building a custom pipeline: registered `preprocess` hooks must run ' +
				'before `Markdoc.transform` (snippet pre-resolves to a Markdoc `fence` node).',
		);
	},
});
