import type { NodeType } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { toKebabCase } from '@refrakt-md/transform';
import { RenderableNodeCursor } from './renderable.js';

export { toKebabCase };

export interface TransformResult {
	tag: NodeType;
	id?: string;
	class?: string;
	/** Structural property name — becomes data-field on the wrapper (BEM/theming) */
	property?: string;
	/** A `null` or `undefined` slot value is skipped, so pass optional tags directly. */
	properties?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | null | undefined>;
	refs?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | null | undefined>;
	children: RenderableTreeNodes;
}

/** Rune identity + transform result — single-object form for createComponentRenderable */
export interface InlineTransformResult extends TransformResult {
	/** Rune name in kebab-case (e.g. 'hint', 'accordion-item') */
	rune: string;
}

/**
 * Create a renderable tag with rune identity and structural metadata.
 *
 * Pass a single object with `rune` (kebab-case name) and the tag spec.
 * Structured data is not set here: a rune declares its schema.org row on
 * `createContentModelSchema({ schema })`, and the table applier stamps
 * `typeof` / `property` (SPEC-130).
 */
export function createComponentRenderable(result: InlineTransformResult): Tag {
	const runeName = result.rune;

	// Validate that property and ref names don't collide (ADR-008: flat namespace)
	if (result.properties && result.refs) {
		const propKeys = new Set(Object.keys(result.properties));
		const collisions = Object.keys(result.refs).filter((k) => propKeys.has(k));
		if (collisions.length > 0) {
			throw new Error(
				`Rune "${runeName}" has naming collisions between properties and refs: ${collisions.join(', ')}. ` +
					`Properties and refs share a flat namespace (ADR-008) and must have unique names.`,
			);
		}
	}

	// Project scalar field values into the reserved `data-rune-fields` attribute
	// (the data channel). Every property tag gets `data-field`; a meta's content
	// also lands in the bag. Content-marker properties (non-meta, e.g. budget's
	// `category`) get `data-field` but no field entry. Keys stay as authored
	// (camelCase, matching modifier names — no kebab transit).
	// SPEC-082 (WORK-331): the `data-rune-fields` bag is the sole field-data
	// representation. Collect the data metas so they can be dropped from the
	// emitted children — the value already lives in the bag. A meta with
	// undefined content contributes no value and is not dropped.
	const fields: Record<string, unknown> = {};
	const pureDataMetas = new Set<unknown>();
	for (const [k, v] of Object.entries(result.properties ?? {})) {
		if (v == null) continue;
		const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

		const values: unknown[] = [];
		tags.forEach((n) => {
			if (Markdoc.Tag.isTag(n)) {
				n.attributes['data-field'] = toKebabCase(k);
				if (n.name === 'meta' && n.attributes.content !== undefined) {
					values.push(n.attributes.content);
					pureDataMetas.add(n);
				}
			}
		});
		if (values.length === 1) fields[k] = values[0];
		else if (values.length > 1) fields[k] = values;
	}

	for (const [k, v] of Object.entries(result.refs || {})) {
		if (v == null) continue;
		const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

		tags.forEach((n) => {
			if (Markdoc.Tag.isTag(n)) {
				n.attributes['data-name'] = k;
			}
		});
	}

	const childArray = (Array.isArray(result.children) ? result.children : [result.children]).filter(
		(c) => !pureDataMetas.has(c),
	);

	const tag = new Markdoc.Tag(
		result.tag,
		{
			id: result.id,
			'data-field': result.property ? toKebabCase(result.property) : result.property,
			'data-rune': runeName,
			class: result.class,
			...(Object.keys(fields).length > 0 ? { 'data-rune-fields': JSON.stringify(fields) } : {}),
		},
		childArray,
	);

	return tag;
}

/**
 * Remove the schema.org channel from a subtree (WORK-552).
 *
 * `typeof` and `property` are the whole channel: the schema-table applier
 * stamps them, and `collectJsonLd` *derives* the JSON-LD by walking the tree for
 * `typeof`. Deleting both therefore removes the RDFa and the JSON-LD together —
 * there is no third place structured data hides.
 *
 * Whole subtree, not just the root, because a child rune declares its own type
 * independently: an `accordion-item` emits `Question` whether or not its
 * `accordion` emits `FAQPage`. Stripping only the root would leave orphan
 * `Question` nodes with no container, which is worse than either consistent
 * state.
 *
 * **This has to run during the transform.** `extractSeo` reads the
 * `Markdoc.transform` output before the identity transform ever sees the tree,
 * so a later pass would clean the HTML and leave the JSON-LD already harvested —
 * a failure that looks fixed on the page and is not.
 */
export function stripSchemaOrg<T>(nodes: T): T {
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) {
			node.forEach(visit);
			return;
		}
		if (!Markdoc.Tag.isTag(node as never)) return;
		const tag = node as Tag;
		delete tag.attributes.typeof;
		delete tag.attributes.property;
		(tag.children ?? []).forEach(visit);
	};
	visit(nodes);
	return nodes;
}
