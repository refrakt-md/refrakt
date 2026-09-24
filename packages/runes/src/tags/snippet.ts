import { createContentModelSchema } from '../lib/index.js';

/**
 * The `snippet` rune — embed a file's contents as a syntax-highlighted code
 * block (SPEC-062).
 *
 * Implementation note: snippet is implemented as an **AST preprocessor**
 * rather than a transform-time rune. Every `{% snippet %}` tag is replaced
 * by a Markdoc `fence` node before the schema-driven transform runs (see
 * `corePipelineHooks.preprocess` in `../config.ts`). By the time the transform
 * reaches the AST, no snippet tags exist — only fences. So this schema's
 * `transform` function is **unreachable in normal operation**.
 *
 * The schema still exists for tooling: `refrakt inspect snippet`, the
 * contracts generator, attribute validation, and the rune-catalog docs all
 * read from it. If the transform ever does execute (e.g., the core preprocess
 * hook isn't registered for some reason), it throws a clear error pointing
 * the user at the registration site.
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
	transform(_resolved, _attrs) {
		// Unreachable in normal operation — corePipelineHooks.preprocess
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
