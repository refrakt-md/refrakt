import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { recordSchemaOrigin } from './schema-side-table.js';
import { OWNER_ATTR, SLOT_ATTR } from './schema-table.js';

/**
 * Declare the two slot markers on every schema in a map — SPEC-145 D10a step 2.
 *
 * ## Why every schema has to declare them
 *
 * Composition sets `OWNER_ATTR` and `SLOT_ATTR` on the AST, before
 * `Markdoc.transform`, and Markdoc's transform keeps only the attributes a
 * schema declares. A marker on a paragraph whose schema does not name it is
 * gone from the rendered `<p>` with no trace, and the composed rune's schema
 * row then resolves nothing — which looks exactly like optional content left
 * empty.
 *
 * ## Why here, once, rather than in each rune
 *
 * Declared per rune, a new rune would be uncovered until someone remembered.
 * Declared where the Markdoc config is assembled — core nodes plus every
 * plugin's runes — every schema is covered, including ones written after this.
 * And no rune's own declaration carries them, so the authoring surfaces that
 * read a rune's schema (`reference`, the editor, the AI prompt) never offer an
 * author two attributes only composition may set.
 *
 * Copies, never mutates: the input maps are module-level exports shared by
 * every caller, and `Markdoc.nodes` belongs to Markdoc. Each copy records the
 * schema it came from, so the side tables keyed by schema (`SchemaSideTable`)
 * still answer for it. The copy is memoised on the input map, so a site
 * assembling the same config for every page builds it once.
 */
export function declareSlotMarkers<T extends Record<string, Schema>>(schemas: T): T {
	const cached = assembled.get(schemas);
	if (cached) return cached as T;
	const out: Record<string, Schema> = {};
	for (const [name, schema] of Object.entries(schemas)) {
		out[name] = schema ? withMarkers(schema) : schema;
	}
	assembled.set(schemas, out);
	return out as T;
}

/**
 * The node map a page is transformed against, every node declaring the markers.
 *
 * Includes Markdoc's defaults for the nodes `nodes` does not override —
 * `blockquote`, `hr`, `code`, `s`, `inline` — because Markdoc falls back to its
 * own schema for those, and its own schema declares nothing.
 */
export function declareSlotMarkersOnNodes<T extends Record<string, Schema>>(nodes: T): T {
	const cached = assembledNodes.get(nodes);
	if (cached) return cached as T;
	const out = declareSlotMarkers({ ...Markdoc.nodes, ...nodes } as Record<string, Schema>);
	assembledNodes.set(nodes, out);
	return out as T;
}

const assembled = new WeakMap<object, Record<string, Schema>>();
const assembledNodes = new WeakMap<object, Record<string, Schema>>();

function withMarkers(schema: Schema): Schema {
	if (schema.attributes?.[OWNER_ATTR] && schema.attributes?.[SLOT_ATTR]) return schema;
	// Keep the prototype: a schema need not be a plain literal, and spreading a
	// class instance would drop its `transform`.
	const copy = Object.create(Object.getPrototypeOf(schema)) as Schema;
	Object.assign(copy, schema);
	copy.attributes = {
		...(schema.attributes ?? {}),
		[OWNER_ATTR]: { type: String },
		[SLOT_ATTR]: { type: String },
	};
	recordSchemaOrigin(copy, schema);
	return copy;
}
