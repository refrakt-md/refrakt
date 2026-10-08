import type { Schema } from '@markdoc/markdoc';

/**
 * A declaration kept beside a schema rather than on it, keyed by the schema.
 *
 * Several of a rune's self-declarations — its schema table, its preprocess
 * hook, its structure, its registers — live in side tables because Markdoc's
 * `Schema` type has nowhere to put them and tooling has only the schema to
 * read from. A side table is keyed by object identity.
 *
 * **That identity does not survive config assembly** (SPEC-145 D10a).
 * `declareSlotMarkers` gives every schema a copy declaring the slot markers,
 * rather than mutating the shared runes, and a plain `WeakMap` would then answer
 * nothing for the copy: an `{% include %}` stops being preprocessed and a schema
 * table stops being applied. So the copy records the schema it came from, and
 * every side table falls back to that origin. One rule, in one class, instead of
 * each lookup knowing about assembly.
 */
export class SchemaSideTable<V> extends WeakMap<Schema, V> {
	override get(schema: Schema): V | undefined {
		return super.has(schema) ? super.get(schema) : super.get(originOf(schema));
	}

	override has(schema: Schema): boolean {
		return super.has(schema) || super.has(originOf(schema));
	}
}

const origins = new WeakMap<Schema, Schema>();

/** Record that `copy` declares the same rune as `origin`. */
export function recordSchemaOrigin(copy: Schema, origin: Schema): void {
	origins.set(copy, originOf(origin));
}

/** The schema a copy was made from, or the schema itself. */
export function originOf(schema: Schema): Schema {
	return origins.get(schema) ?? schema;
}
