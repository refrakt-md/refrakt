import { createContentModelSchema } from '../lib/index.js';

/**
 * The `data` rune — ingest an external tabular source (CSV/TSV/JSON/NDJSON) and
 * emit a Markdoc `table` node that `chart` and `datatable` consume unchanged
 * (SPEC-103).
 *
 * Like `snippet`, `data` is implemented as an **AST preprocessor**: every
 * `{% data %}` tag is resolved (read through the SPEC-113 `ProjectFiles` seam,
 * adapted, projected, typed) and replaced with a `table` AST node before the
 * schema-driven transform runs (see `corePipelineHooks.preprocess` in
 * `../config.ts`). By the time the transform reaches the AST, no `data` tags
 * remain — so this schema's `transform` is **unreachable in normal operation**.
 *
 * The schema still exists for tooling: `refrakt inspect data`, the contracts
 * generator, attribute validation, and the rune-catalog docs all read from it.
 * If the transform ever executes (the preprocess hook isn't wired), it throws a
 * clear error pointing at the registration site.
 */
export const data = createContentModelSchema({
	attributes: {
		// Core.
		src: { type: String, required: true, description: 'Path to the source file, relative to the project root (sandboxed).' },
		format: { type: String, required: false, matches: ['csv', 'tsv', 'json', 'ndjson'], description: 'Source format. Inferred from the file extension; override for ambiguity.' },
		// CSV / TSV.
		delimiter: { type: String, required: false, description: 'Override the field separator (CSV/TSV).' },
		header: { type: Boolean, required: false, description: 'Whether the first row is the header (default true). false synthesizes col1…' },
		// JSON (adapter lands in WORK-486; declared here for the full surface).
		root: { type: String, required: false, description: 'JSON: dotted path / JSON Pointer to the array or map within the document.' },
		orient: { type: String, required: false, matches: ['records', 'values', 'index'], description: 'JSON: how each element maps to a row. records/values auto-detected; index is explicit.' },
		'key-column': { type: String, required: false, description: 'JSON: when orient=index, the header for the synthesized key column.' },
		// Shared projection.
		columns: { type: String, required: false, description: 'Select + order + rename: "name as Product, revenue as \'Revenue ($)\'".' },
		where: { type: String, required: false, description: 'Filter rows with the field:value grammar (SPEC-070).' },
		sort: { type: String, required: false, description: 'Sort by a column; "-" prefix for descending.' },
		limit: { type: Number, required: false, description: 'Maximum number of rows.' },
		offset: { type: Number, required: false, description: 'Skip this many rows before limiting.' },
		// Shared typing.
		numeric: { type: String, required: false, description: 'Comma-separated columns to force to numeric typing (emits data-value).' },
		text: { type: String, required: false, description: 'Comma-separated columns to force to text typing.' },
	},
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, _attrs) {
		// Unreachable in normal operation — corePipelineHooks.preprocess replaces
		// `data` tags with `table` nodes before the transform runs.
		throw new Error(
			'data rune reached the transform phase — its preprocess hook was not wired through. ' +
			'Ensure the content pipeline runs registered `preprocess` hooks before `Markdoc.transform` ' +
			'(data pre-resolves to a Markdoc `table` node; see SPEC-103 § Architecture).',
		);
	},
});
