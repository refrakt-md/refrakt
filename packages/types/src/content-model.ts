/**
 * Declarative content model types.
 *
 * A content model describes how a rune's AST children are grouped and
 * assigned to named fields.  The resolver engine uses these declarations
 * to replace per-rune `processChildren` methods with a generic, data-driven
 * resolution step.
 */

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

/** Describes a single named field in a content model. */
export interface ContentFieldDefinition {
	/** Field name — becomes the key in the resolved output. */
	name: string;

	/**
	 * Node type to match.
	 *
	 * Block-level: 'paragraph', 'heading', 'heading:2', 'list',
	 *   'list:ordered', 'list:unordered', 'image', 'blockquote',
	 *   'fence', 'hr', 'tag:NAME', 'any'.
	 *
	 * Inline-level (for itemModel / headingExtract — future):
	 *   'strong', 'em', 'link', 'image', 'code', 'text'.
	 */
	match: string;

	/** Whether the field can be absent without warning. Default `false`. */
	optional?: boolean;

	/** Consume all consecutive matching nodes into an array. Default `false`. */
	greedy?: boolean;

	/** Markdoc snippet for editor insertion (future). */
	template?: string;

	/** Human-readable description for editor UI (future). */
	description?: string;
}

// ---------------------------------------------------------------------------
// Structural patterns
// ---------------------------------------------------------------------------

/** Pattern 1 — children matched in order by node type. */
export interface SequenceModel {
	type: 'sequence';
	fields: ContentFieldDefinition[];
}

/** A named zone within a delimited model. */
export interface DelimitedZone extends SequenceModel {
	name: string;
}

/** Pattern 3 — children split into groups by a delimiter node. */
export interface DelimitedModel {
	type: 'delimited';

	/** Delimiter node type (typically `'hr'`). */
	delimiter: string;

	/** Named zones — each group maps to a declared zone by index. */
	zones?: DelimitedZone[];

	/** When `true`, the number of zones is determined by delimiter count. */
	dynamicZones?: boolean;

	/** Zone model used when `dynamicZones` is `true`. */
	zoneModel?: SequenceModel;
}

// ---------------------------------------------------------------------------
// Content model union
// ---------------------------------------------------------------------------

/**
 * A content model declaration.
 *
 * Currently supports `sequence` and `delimited` patterns.
 * `sections` and `custom` patterns will be added in later phases.
 */
export type ContentModel = SequenceModel | DelimitedModel;

// ---------------------------------------------------------------------------
// Resolver output
// ---------------------------------------------------------------------------

/** A single resolved field value. */
export type ResolvedField = unknown | unknown[] | ResolvedContent | undefined;

/** The output of resolving a content model against AST children. */
export interface ResolvedContent {
	[fieldName: string]: ResolvedField;
}
