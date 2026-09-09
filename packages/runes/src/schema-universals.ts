import type { Schema } from '@markdoc/markdoc';
import { schemaRuneStructures } from './lib/index.js';
import { AXIS_ATTRIBUTES, resolveUniversalAttributes } from './universal-attributes.js';
import { UNIVERSAL_ATTRIBUTE_NAMES } from './attribute-presets.js';

/**
 * What a *schema alone* can say about a rune's universal attributes — WORK-535.
 *
 * `refrakt reference` has no theme config: its `ReferenceContext` carries
 * schemas, fixtures and source names, nothing more. That is the right shape,
 * because applicability is rune identity (ADR-028) — so this answers the
 * question from the schema, using the posture and join tables recorded on
 * `schemaRuneStructures` at construction.
 *
 * **The schema is the ground truth; the rule only explains it.** `available`
 * is read off the schema's own attribute list rather than recomputed, and an
 * axis is reported unavailable only if the schema really carries none of its
 * attributes. So the reasons can never contradict the attribute list a reader
 * sees next to them — which matters, because "the tool states as fact something
 * false about the rune it is describing" is the failure SPEC-125 exists to fix,
 * and an explanation that drifts from the schema would be a new instance of it.
 */
export interface UnavailableAxis {
	/** Axis name, as the facet registry knows it (`reading`, `frame`, …). */
	axis: string;
	/** Why it does not apply here — the same prose the structure contract records. */
	reason: string;
	/** The author-facing attributes the rune therefore does not carry. */
	attributes: string[];
}

export interface SchemaUniversals {
	/** Universal attributes the schema actually declares, in canonical order. */
	available: string[];
	/** Axes the rune carries no attributes for, each with its reason, axis-sorted. */
	unavailable: UnavailableAxis[];
}

/** Canonical ordering — the order `UNIVERSAL_ATTRIBUTE_NAMES` declares. */
const canonicalOrder = [...UNIVERSAL_ATTRIBUTE_NAMES];

export function describeSchemaUniversals(schema: Schema): SchemaUniversals {
	const declared = new Set(Object.keys(schema.attributes ?? {}));
	const available = canonicalOrder.filter((name) => declared.has(name));

	const structure = schemaRuneStructures.get(schema);
	const explained = resolveUniversalAttributes({
		posture: structure?.universalAttributes,
		structure,
		declaredAttributes: declared,
	}).unavailable;

	const unavailable: UnavailableAxis[] = [];
	for (const [axis, names] of Object.entries(AXIS_ATTRIBUTES)) {
		// Axes the schema does carry are available, whatever the rule says — see
		// the note above on which of the two is authoritative.
		if (names.some((name) => declared.has(name))) continue;
		unavailable.push({
			axis,
			reason: explained.get(axis) ?? UNRECORDED_REASON,
			attributes: [...names],
		});
	}
	unavailable.sort((a, b) => a.axis.localeCompare(b.axis));

	return { available, unavailable };
}

/**
 * The fallback when an axis is absent and nothing explains it.
 *
 * Reachable only for a hand-written schema with no recorded posture — i.e. a new
 * rune that skipped both `createContentModelSchema` and
 * `declareUniversalPosture`. Saying so is better than inventing a structural
 * reason that the rune never declared.
 */
export const UNRECORDED_REASON = 'this rune declares no posture for it';
