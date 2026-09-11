import { createContentModelSchema } from '../lib/index.js';

/**
 * The `include` rune — paste a file's AST into the page during **preprocess**
 * (SPEC-129).
 *
 * `{% partial %}` is Markdoc's, and Markdoc expands it during
 * `Markdoc.transform`. refrakt's preprocessors — `data` (SPEC-103) and
 * `snippet` (SPEC-062) — walk the *page's* AST before that, so a preprocessor
 * rune inside a partial is never in the tree when they run and survives to its
 * own throwing transform. `include` closes that gap: it splices the file's
 * parsed AST into the page ahead of every other preprocess step, so the pasted
 * content is preprocessed exactly as if it had been typed there.
 *
 * Both runes read the same `_partials/` directory and the same `namespace:file`
 * roots — a file's *location* should not depend on its *contents*, so only the
 * call site differs. `partial` stays the documented default; reach for
 * `include` when the file contains `data` or `snippet`.
 *
 * Like `snippet` and `data`, this is an **AST preprocessor**, so the schema's
 * `transform` is unreachable in normal operation. It exists for tooling
 * (`refrakt inspect include`, contracts, attribute validation, the rune
 * catalog) and throws a message pointing at the wiring if it ever runs.
 */
export const include = createContentModelSchema({
	attributes: {
		file: {
			type: String,
			required: true,
			description: 'Partial to paste, by the same key `{% partial %}` uses — a path under the site\'s `_partials/` (e.g. "attrs.md") or a namespaced file root ("shared:attrs.md").',
		},
		variables: {
			type: Object,
			required: false,
			description: 'Bindings substituted into the pasted AST at paste time, e.g. variables={q: "rune:card"} makes `$q` inside the file that string. Unlike `partial`, this is substitution rather than a transform-time scope, so bound values reach preprocessor attributes such as `{% data where=$q %}`.',
		},
	},
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, _attrs) {
		// Unreachable in normal operation — corePipelineHooks.preprocess splices
		// `include` tags away before the transform runs.
		throw new Error(
			'{% include %} reached the transform phase unresolved — its preprocess hook was not ' +
			'wired through. Ensure the content pipeline runs registered `preprocess` hooks before ' +
			'`Markdoc.transform` (include pastes its file\'s AST; see SPEC-129).',
		);
	},
});
