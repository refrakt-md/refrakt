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
			description: 'Path to the source file, relative to the project root. Rejected if it escapes the root.',
		},
		lines: {
			type: String,
			required: false,
			description: 'Line range. Formats: "10-25", "10-" (to EOF), "-20" (from start), "10" (single line). 1-indexed, inclusive.',
		},
		lang: {
			type: String,
			required: false,
			description: 'Syntax-highlighting language hint. Overrides the extension-based inference.',
		},
		linenumbers: {
			type: Boolean,
			required: false,
			description: 'Show line numbers in the gutter. Starting number derives from the `lines` range start (e.g. lines="74-125" → first line is 74), so numbers reflect the file\'s real offsets. WORK-304.',
		},
		highlight: {
			type: String,
			required: false,
			description: 'Range(s) to emphasize without cropping — Shiki-style format: "74-78", "74-78,82,90-92". Indices are file coordinates (same frame as `lines=`). Use this when you want full context visible but want to draw the eye to specific lines. WORK-304.',
		},
	},
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, _attrs) {
		// Unreachable in normal operation — corePipelineHooks.preprocess
		// replaces snippet tags with fence nodes before the transform runs.
		// If you see this error, ensure your content pipeline runs the
		// preprocess phase (call sites: packages/content/src/site.ts and the
		// hook set assembled via createCorePipelineHooks).
		throw new Error(
			'snippet rune reached the transform phase — its preprocess hook was not wired through. ' +
			'Ensure the content pipeline runs registered `preprocess` hooks before `Markdoc.transform` ' +
			'(snippet pre-resolves to a Markdoc `fence` node; see SPEC-062 § Composition).',
		);
	},
});
