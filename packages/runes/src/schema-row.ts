import type { Schema } from '@markdoc/markdoc';
import { schemaTables } from './lib/index.js';
import { selectRow } from './lib/schema-table.js';
import type { SchemaTable, SchemaRow, EntityRow } from './lib/schema-table.js';

/**
 * Describe a rune's resolved schema.org row — SPEC-130 / WORK-566.
 *
 * Lives here, beside the tables, because three consumers need the same answer:
 * `refrakt inspect` (the per-rune review view), `refrakt contracts` (the
 * committed artifact), and the contract's own drift test. Keeping it in the CLI
 * meant the test could not reach it, and the only alternative was a second
 * implementation to drift — which is the failure this milestone keeps finding.
 *
 * SPEC-130 D5 dispenses with validating a table against schema.org: refrakt
 * ships no ontology, so nothing can check that `PodcastEpisode` is the right
 * item type for `PodcastSeries`. **Visibility replaces validation**, and this is
 * what makes the row visible.
 */

/** One property mapping, flattened for display. */
export interface SchemaPropertyRow {
	/** The source name in the rune's flat namespace. */
	source: string;
	/** The schema.org property it maps to. */
	property: string;
	/** How the value is obtained. */
	kind: 'property' | 'text' | 'generated';
	/** The entity this row belongs to, when nested. */
	entity?: string;
	/**
	 * Set when the mapping applies to a *child rune's* node rather than to this
	 * rune's own output.
	 *
	 * A nested `entities:` span is built out of the rune's own content, so its
	 * sources resolve against the same tree. A `children:` row does not: it
	 * retypes nodes another rune emitted, which carry their own attributes and
	 * their own field bag. Anything auditing a source has to look in the right
	 * place, and without this it cannot tell which place that is.
	 */
	scope?: 'child';
}

/** A rune's resolved schema row, flattened for display. */
export interface ResolvedSchemaRow {
	/** The schema.org type emitted. */
	type?: string;
	/** The attribute a multi-row table selects on, if any. */
	by?: string;
	/** The attribute value this row was selected for, if any. */
	selectedFor?: string;
	/** Every property mapping, parent and nested. */
	properties: SchemaPropertyRow[];
	/** Nested entities: name → type and the property holding it. */
	entities: Array<{ name: string; type: string; property: string }>;
	/** Per-child-rune retyping. */
	children: Array<{ rune: string; type: string; property: string }>;
	/** Properties that always serialise as an array (D6). */
	lists: string[];
}

/** The table a rune declares, if it declares one. */
export function tableFor(rune: { schema?: Schema }): SchemaTable | undefined {
	return rune.schema ? schemaTables.get(rune.schema) : undefined;
}

function flattenEntity(
	name: string,
	entity: EntityRow,
	into: SchemaPropertyRow[],
	scope?: 'child',
): void {
	for (const [source, property] of Object.entries(entity.properties ?? {})) {
		into.push({ source, property, kind: 'property', entity: name, scope });
	}
	for (const [source, property] of Object.entries(entity.text ?? {})) {
		into.push({ source, property, kind: 'text', entity: name, scope });
	}
	for (const property of Object.keys(entity.generated ?? {})) {
		into.push({ source: '(index)', property, kind: 'generated', entity: name, scope });
	}
}

/** Resolve a table to the row a set of attributes selects, flattened. */
export function describeSchemaRow(
	table: SchemaTable,
	attrs: Record<string, unknown> = {},
): ResolvedSchemaRow {
	const row: SchemaRow = selectRow(table, attrs);
	const properties: SchemaPropertyRow[] = [];

	for (const [source, property] of Object.entries(row.properties ?? {})) {
		properties.push({ source, property, kind: 'property' });
	}
	for (const [source, property] of Object.entries(row.text ?? {})) {
		properties.push({ source, property, kind: 'text' });
	}
	for (const property of Object.keys(row.generated ?? {})) {
		properties.push({ source: '(index)', property, kind: 'generated' });
	}

	const entities: ResolvedSchemaRow['entities'] = [];
	for (const [name, entity] of Object.entries(row.entities ?? {})) {
		entities.push({ name, type: entity.type, property: entity.property });
		flattenEntity(name, entity, properties);
	}

	const children: ResolvedSchemaRow['children'] = [];
	for (const [rune, child] of Object.entries(row.children ?? {})) {
		children.push({ rune, type: child.type, property: child.property });
		flattenEntity(rune, child, properties, 'child');
	}

	const selected =
		table.by !== undefined && attrs[table.by] !== undefined ? String(attrs[table.by]) : undefined;

	return {
		type: row.type,
		by: table.by,
		selectedFor: selected,
		properties,
		entities,
		children,
		lists: [...(row.lists ?? [])],
	};
}

/**
 * Order a resolved row by schema.org property rather than authoring order.
 *
 * The review question is "what does this rune claim about its content", which is
 * answered property-first; the authoring view is source-first. They need not
 * match, and `reference` reads it this way.
 */
export function bySchemaProperty(rows: SchemaPropertyRow[]): SchemaPropertyRow[] {
	return [...rows].sort(
		(a, b) => a.property.localeCompare(b.property) || a.source.localeCompare(b.source),
	);
}

/**
 * Every declared schema row in a rune catalog, keyed by the rune's own name.
 *
 * Keyed by rune name rather than by the theme-config key: a *plugin* rune has no
 * `typeName` at all, so keying off that silently covered nothing for the 67 of
 * 95 runes that live in plugins — exactly the population D7 is about.
 */
export function collectSchemaRows(
	runes: Record<string, { name: string; schema?: Schema }>,
): Record<string, ResolvedSchemaRow> {
	const out: Record<string, ResolvedSchemaRow> = {};
	for (const rune of Object.values(runes)) {
		const table = rune.schema ? schemaTables.get(rune.schema) : undefined;
		if (table) out[rune.name] = describeSchemaRow(table);
	}
	return out;
}
