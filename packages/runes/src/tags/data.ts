import { createContentModelSchema } from '../lib/index.js';
import { preprocessDataTag } from '../data-pipeline.js';

export const data = createContentModelSchema({
	attributes: {
		src: {
			type: String,
			required: true,
			description: 'Path to the source file, relative to the project root (sandboxed).',
		},
		format: {
			type: String,
			required: false,
			matches: ['csv', 'tsv', 'json', 'ndjson'],
			description: 'Source format. Inferred from the file extension; override for ambiguity.',
		},
		delimiter: {
			type: String,
			required: false,
			description: 'Override the field separator (CSV/TSV).',
		},
		header: {
			type: Boolean,
			required: false,
			description:
				'CSV/TSV: whether the first row is the header (default true). false synthesizes col1…',
		},
		root: {
			type: String,
			required: false,
			description: 'JSON: dotted path / JSON Pointer to the array or map within the document.',
		},
		orient: {
			type: String,
			required: false,
			matches: ['records', 'values', 'index'],
			description:
				'JSON: how each element maps to a row. records/values auto-detected; index is explicit.',
		},
		'key-column': {
			type: String,
			required: false,
			description: 'JSON: when orient=index, the header for the synthesized key column.',
		},
		columns: {
			type: String,
			required: false,
			description: 'Select + order + rename: "name as Product, revenue as \'Revenue ($)\'".',
		},
		where: {
			type: String,
			required: false,
			description: 'Filter rows with `field:value` clauses.',
		},
		sort: {
			type: String,
			required: false,
			description: 'Sort by a column; "-" prefix for descending.',
		},
		limit: { type: Number, required: false, description: 'Maximum number of rows.' },
		offset: { type: Number, required: false, description: 'Skip this many rows before limiting.' },
		headers: {
			type: String,
			required: false,
			description:
				'Header labels for a `---`-delimited body, e.g. "Attribute, Type". Setting it makes the body one table ROW — cells separated by `---` — instead of a run of blocks, so cells can carry emphasis, links, runes and {% if %}. Requires a body.',
		},
		numeric: {
			type: String,
			required: false,
			description: 'Comma-separated columns to force to numeric typing (emits data-value).',
		},
		text: {
			type: String,
			required: false,
			description: 'Comma-separated columns to force to text typing.',
		},
	},
	// Empty but required: `preprocess` replaces the body, and Markdoc rejects a tag with none.
	contentModel: { type: 'sequence', fields: [] },
	preprocess: preprocessDataTag,
	transform(_resolved, _attrs) {
		throw new Error(
			'{% data %} reached the transform phase unresolved.\n\n' +
				'If this file is pulled in with {% partial %}: use {% include %} instead. ' +
				'Markdoc expands partials during the transform, which is after the preprocess ' +
				'phase that resolves `data` — so a `data` tag inside a partial never gets read. ' +
				'{% include file="..." /%} pastes the file before preprocess, so `data` and ' +
				'`snippet` inside it resolve. Both runes read the same `_partials/` directory ' +
				'and file roots, so only the call site changes.\n\n' +
				'If you are building a custom pipeline: registered `preprocess` hooks must run ' +
				'before `Markdoc.transform` (data pre-resolves to a Markdoc `table` node).',
		);
	},
});
