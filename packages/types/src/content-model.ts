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

// ---------------------------------------------------------------------------
// Heading extraction (for sections pattern)
// ---------------------------------------------------------------------------

/** A field extracted from section heading text. */
export interface HeadingExtractField {
	/** Field name — becomes key in extracted output. */
	name: string;
	/** Match type — currently only 'text' (matches against heading text). */
	match: 'text';
	/** Pattern to extract. RegExp uses capture group 1. 'remainder' takes rest of text. */
	pattern: RegExp | 'remainder';
	/** Whether the field can fail to match. Default `false`. */
	optional?: boolean;
}

/** Defines how structured data is parsed from section heading text. */
export interface HeadingExtract {
	fields: HeadingExtractField[];
}

/** Pattern 2 — children split into sections by heading elements. */
export interface SectionsModel {
	type: 'sections';

	/**
	 * Heading type to split on.
	 * `'heading'` auto-detects level from first heading child.
	 * `'heading:N'` uses an explicit level (e.g. `'heading:2'`).
	 */
	sectionHeading: string;

	/** Preamble fields — resolved against content before the first section heading. */
	fields?: ContentFieldDefinition[];

	/** Content model applied to each section's body. */
	sectionModel: ContentModel;

	/** When set, sections are emitted as child rune tag nodes with this tag name. */
	emitTag?: string;

	/**
	 * Attribute mapping for emitted tags.
	 * Values starting with `$` are references: `$heading` = heading text,
	 * `$fieldName` = heading-extracted field. Other values are literals.
	 */
	emitAttributes?: Record<string, string>;

	/** Extract structured data from heading text. */
	headingExtract?: HeadingExtract;
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
 * Supports `sequence`, `sections`, and `delimited` patterns.
 * A `custom` pattern will be added in a later phase.
 */
export type ContentModel = SequenceModel | SectionsModel | DelimitedModel;

// ---------------------------------------------------------------------------
// Resolver output
// ---------------------------------------------------------------------------

/** A single resolved field value. */
export type ResolvedField = unknown | unknown[] | ResolvedContent | undefined;

/** The output of resolving a content model against AST children. */
export interface ResolvedContent {
	[fieldName: string]: ResolvedField;
}
