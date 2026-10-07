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

/** Resolve a Markdoc attribute value to a string. Handles literal strings
 *  and Markdoc `Variable` AST nodes (e.g. `path=$file.path` parses as a
 *  Variable, not a string). Unresolvable references (variable missing from
 *  the context, or attribute is some other AST shape) return an empty
 *  string — matching transform-time variable-evaluation behaviour. */
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

/** Build a `fence` AST node that renders a clear error message in place of
 *  the snippet. Used when resolution fails (sandbox, missing file, malformed
 *  lines, unresolvable variable reference). The fence carries the original
 *  attempted path in `source` so tooling can still detect snippet
 *  provenance, plus a `data-snippet-error` raw data-attr that's
 *  forwarded through the fence transform for the error styling hook. */
function makeErrorFence(pathAttr: string, message: string): Node {
	return new Ast.Node('fence', {
		content: `snippet error: ${message}\n`,
		language: 'text',
		source: pathAttr || '(unresolved)',
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
	// WORK-304 — propagate author-set fence-level annotations from the
	// snippet rune through to the fence node. The fence schema renders
	// them as `data-linenumbers` / `data-highlight-lines`. `linenumbers`
	// arrives as a Boolean from the rune schema; `highlight` as a String.
	const linenumbers = tag.attributes.linenumbers === true;
	const highlight =
		tag.attributes.highlight !== undefined
			? resolveAttributeValue(tag.attributes.highlight, ctx.variables)
			: undefined;

	// SPEC-131 — anchor attributes. Resolution lands in the shared reader, so
	// `file-ref` gains the same capability from the same change.
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
		// Unexpected error type — still produce an error fence so the build
		// doesn't crash on a single page.
		const msg = (err as Error).message ?? String(err);
		ctx.error(`snippet "${pathAttr}" failed unexpectedly: ${msg}`, page.url);
		return makeErrorFence(pathAttr, msg);
	}

	for (const warning of result.warnings) {
		ctx.warn(warning, page.url);
	}

	// SPEC-134 — the review marker. Evaluated only after the anchor resolved,
	// because D9 layers the two features: SPEC-131 answers *can I find the
	// region* and refuses if not, so a refusal never reaches here at all.
	//
	// A finding is a `PipelineWarning` beside the page and **nothing is
	// rendered into it** (D6). This is deliberately different from SPEC-131's
	// error fence, and the difference is principled: there, the content could
	// not be produced, so the fence takes its place. Here the content was
	// produced perfectly — real, current, correctly located. What is uncertain
	// is the prose beside it, which the resolver cannot see. Replacing a
	// correct code block with an error because a paragraph *might* be stale is
	// a straightforward regression for every reader.
	if (reviewedAttr && reviewedAttr.length > 0) {
		const stored = parseMarker(reviewedAttr);
		const comparison = compareMarker(stored.strict, result.content, stored.loose);
		if (comparison.verdict === 'stale') {
			// Deliberately no diff here: at transform time the only record of
			// the reviewed version is its hash, and a hash cannot be turned
			// back into content. `refrakt snippet review --update` recovers the
			// old slice from git and shows the diff — which is why D5's "show
			// content, never hashes" is the CLI's job rather than this one's.
			ctx.warn(
				`snippet \`${pathAttr}\` has changed since it was last reviewed. Re-read the prose ` +
					'around it, then run `refrakt snippet review --update` to see the diff and re-stamp.',
				page.url,
			);
		}
	}

	const language = langAttr && langAttr.length > 0 ? langAttr : inferLanguage(result.relativePath);

	// WORK-589 — presentation runs strictly **after** the resolved range is
	// fixed, so `reindent` can never shift the coordinates `linenumbers` and a
	// numeric `highlight` read (D13). `highlight-match` is computed against the
	// pre-reindent text because reindent changes columns, not lines.
	const highlightMatchLinesFound = highlightMatch
		? highlightMatchLines(result.content, parseHighlightMatch(highlightMatch))
		: [];

	const content = shouldReindent(result.anchored, reindentAttr)
		? reindent(result.content)
		: result.content;

	// WORK-304 — write unprefixed `source` / `lines` directly. The fence
	// schema renders them as `data-source` / `data-lines`. `linenumbers` /
	// `highlight` are propagated from the rune attributes (file-coordinate
	// semantics — see WORK-304 acceptance criteria).
	const fenceAttrs: Record<string, unknown> = {
		content,
		language,
		source: result.relativePath,
	};
	// The coordinate frame survives anchoring (D13): an anchored slice reports
	// the range it actually resolved to, so `linenumbers` still starts at the
	// real file line and the displayed numbers stay a pointer back into it.
	if (lines) fenceAttrs.lines = lines;
	else if (result.anchored && result.start !== undefined && result.end !== undefined) {
		fenceAttrs.lines = `${result.start}-${result.end}`;
	}
	if (linenumbers) fenceAttrs.linenumbers = true;

	if (highlightMatchLinesFound.length > 0) {
		// Slice offsets converted into the file frame the fence expects.
		const base = result.start ?? 1;
		fenceAttrs.highlight = formatHighlight(highlightMatchLinesFound.map((n) => n + base - 1));
	} else if (highlight && highlight.length > 0) {
		fenceAttrs.highlight = highlight;
	}

	// Construct a fence Ast.Node. Markdoc parses ``` blocks as
	// new Ast.Node('fence', { content, language }) — same shape here.
	return new Ast.Node('fence', fenceAttrs);
}

/**
 * Preprocess (SPEC-062, WORK-304): resolve + slice the source file and replace
 * the tag with a Markdoc `fence` node. The fence carries `content` + `language`
 * (so the code-block transform syntax-highlights it identically to a
 * triple-backtick fence) plus `source` / `lines` and the author-set
 * `linenumbers` / `highlight` annotations, which the fence schema renders as
 * `data-source` / `data-lines` / `data-linenumbers` / `data-highlight-lines` on
 * the output `<pre>` + `<code>`.
 *
 * That is the whole rune: there is no postProcess step (SPEC-141 D5). A
 * standalone snippet renders as the `<pre data-source>` the fence produces —
 * `pre[data-source]` is the selector for snippet-derived code — and container
 * runes (`codegroup`, `diff`) see it as a regular fence and consume it
 * transparently. Captions / titles are intentionally not provided — wrap a
 * snippet in `{% codegroup title="..." %}` if you want a labelled chrome.
 *
 * Always produces a fence: sandbox / missing-file / variable-resolution errors
 * produce an error fence, so the tag never reaches the throwing `transform`.
 * The build keeps going and the failure is visible on the rendered page.
 *
 * No-op without a file provider (e.g. a tree-mode build that hasn't wired one
 * yet) — the tag then falls through to the transform, which names the wiring.
 */
function preprocessSnippet(tag: Node, page: PreprocessPage, ctx: PreprocessContext): Node | void {
	if (!ctx.sandbox) return;
	return resolveSnippetToFence(tag, page, ctx, ctx.sandbox);
}

/**
 * The `snippet` rune — embed a file's contents as a syntax-highlighted code
 * block (SPEC-062).
 *
 * Snippet is an **AST preprocessor** rather than a transform-time rune: its
 * `preprocess` hook (above) replaces every `{% snippet %}` tag with a Markdoc
 * `fence` node before the schema-driven transform runs (SPEC-141). By the time
 * the transform reaches the AST, no snippet tags exist — only fences. So this
 * schema's `transform` function is **unreachable in normal operation**.
 *
 * The schema still exists for tooling: `refrakt inspect snippet`, the
 * contracts generator, attribute validation, and the rune-catalog docs all
 * read from it. If the transform ever does execute, it throws a clear error
 * naming the likely cause (SPEC-141 D7).
 */
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
				'Show line numbers in the gutter. Starting number derives from the `lines` range start (e.g. lines="74-125" → first line is 74), so numbers reflect the file\'s real offsets. WORK-304.',
		},
		highlight: {
			type: String,
			required: false,
			description:
				'Range(s) to emphasize without cropping — Shiki-style format: "74-78", "74-78,82,90-92". Indices are file coordinates (same frame as `lines=`), and stay so under an anchor. Note that a *numeric* highlight under `symbol`/`match` carries the same coordinate exposure anchoring otherwise removes — the resolver chose the region, so the author is guessing at its line numbers. Use `highlight-match` there. WORK-304.',
		},
	},
	contentModel: { type: 'sequence', fields: [] },
	preprocess: preprocessSnippet,
	transform(_resolved, _attrs) {
		// Unreachable in normal operation — the `preprocess` hook above
		// replaces snippet tags with fence nodes before the transform runs.
		//
		// The reachable case is a content author's, not a framework author's:
		// the file was pulled in with `{% partial %}`, which expands during the
		// transform — after the preprocess phase. Name that fix first (SPEC-129).
		throw new Error(
			'{% snippet %} reached the transform phase unresolved.\n\n' +
				'If this file is pulled in with {% partial %}: use {% include %} instead. ' +
				'Markdoc expands partials during the transform, which is after the preprocess ' +
				'phase that resolves `snippet` — so a `snippet` tag inside a partial never gets ' +
				'read. {% include file="..." /%} pastes the file before preprocess, so `snippet` ' +
				'and `data` inside it resolve. Both runes read the same `_partials/` directory ' +
				'and file roots, so only the call site changes.\n\n' +
				'If you are building a custom pipeline: registered `preprocess` hooks must run ' +
				'before `Markdoc.transform` (snippet pre-resolves to a Markdoc `fence` node; ' +
				'see SPEC-062 § Composition).',
		);
	},
});
