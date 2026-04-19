/**
 * Attribute preset registry for rune reference output.
 *
 * A rune built with `createContentModelSchema({ base, attributes })` ends up with
 * three attribute tiers in its merged schema:
 *
 *   1. **own** — declared inline on the rune
 *   2. **base** — opted in via the `base:` option (a shared attribute record)
 *   3. **universal** — auto-merged (tint, tint-mode, bg, width, spacing, inset)
 *
 * After the merge the source of each attribute is lost — `schema.attributes`
 * is a flat record. This registry lets a package publish its shared base
 * records so reference output can label them with a name and description
 * instead of lumping them into the "own" bucket.
 *
 * **Community-package authors**: if your package exports a `Record<string,
 * SchemaAttribute>` that multiple of your runes pass as `base:`, call
 * `registerAttributePreset(theRecord, { name, description })` at module load.
 * The `refrakt reference` output will then identify attributes coming from
 * that record as inherited from your named preset.
 */

import type { Schema, SchemaAttribute } from '@markdoc/markdoc';

export interface AttributePresetMetadata {
	/** Short, human-readable preset name (e.g., `"split layout"`). */
	name: string;
	/** One-sentence description surfaced in reference output. */
	description: string;
}

/** Reference-identity map — a preset is matched by the exact record object. */
const presets = new Map<object, AttributePresetMetadata>();

/**
 * Register an attribute record as a named preset so reference output can
 * classify attributes that come from it.
 *
 * Matching uses reference identity: the same record object passed as `base:`
 * to `createContentModelSchema` must be the same object registered here.
 * Spread/clone the record before registering and you lose the match.
 */
export function registerAttributePreset(
	record: Record<string, SchemaAttribute>,
	metadata: AttributePresetMetadata,
): void {
	presets.set(record, metadata);
}

/** Look up preset metadata for a given record reference, or `undefined`. */
export function lookupAttributePreset(record: object): AttributePresetMetadata | undefined {
	return presets.get(record);
}

/**
 * Map a Markdoc schema back to the `base:` record it was built from.
 * Populated by `createContentModelSchema()` when `base:` is provided.
 */
export const schemaBasePresets = new WeakMap<Schema, Record<string, SchemaAttribute>>();

/** Names of the universal attributes auto-merged into every content-model schema. */
export const UNIVERSAL_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set([
	'tint',
	'tint-mode',
	'bg',
	'width',
	'spacing',
	'inset',
]);
