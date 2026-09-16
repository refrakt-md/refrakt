import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import { SCHEMA_LISTS_ATTR } from '../seo.js';

const { Tag } = Markdoc;

/**
 * The declarative schema.org table, and the applier that realises it
 * (SPEC-130 / WORK-565).
 *
 * ## Why this is data consulted at transform time, not engine config
 *
 * The obvious home is the identity transform engine, and it does not work.
 * `packages/content/src/site.ts` never applies the engine — it runs
 * `Markdoc.transform`, then `extractSeo`, and `collectJsonLd` *derives* the
 * JSON-LD by walking that tree for `typeof`. The engine runs later, at render
 * time, so schema emitted there would reach the HTML and never reach the
 * JSON-LD.
 *
 * So the table is an option to `createContentModelSchema`, sitting beside the
 * rune's other self-declarations (`sections`, `mediaSlots`, `provides`, `base`),
 * and the applier runs on the rune's own output.
 *
 * ## Three resolution strategies, and why the third exists
 *
 * `createComponentRenderable` drops a property `<meta>` that no `schema:` map
 * names — it is classified pure data and its value is already in the bag. Once
 * runes stop declaring `schema:` themselves, those nodes are gone by the time
 * the applier runs. The bag is the recovery:
 *
 * 1. **Stamp in place** — a named node that survives into the output.
 * 2. **Rebuild from the bag** — a value-only source whose carrier was dropped.
 * 3. **Synthesise an entity** — a nested span built from either of the above.
 *
 * That is why `createComponentRenderable` needs no knowledge of schema at all:
 * it simply always treats property metas as pure data, which is what it already
 * does when `schema:` is absent.
 *
 * ## Name resolution is attribute-agnostic, deliberately
 *
 * A source resolves whether it surfaces as `data-name` or `data-field`, and the
 * applier never branches on which. SPEC-133 moves ~97 nodes between `properties`
 * and `refs`; under this rule every one of those moves is a no-op for every
 * table, because the table keys on a name in the rune's flat namespace
 * (ADR-008), not on the attribute that happens to carry it.
 */

/**
 * Marks a `typeof` the **author** stated, which a parent may not overrule.
 *
 * D9's default stands: a parent's `children` row retypes its children, and a
 * child that says nothing about its type gets the parent's. This is the narrow
 * opt-out — a `{% track type="song" %}` inside a `{% playlist type="podcast" %}`
 * stays a song, because saying so and being overruled anyway would make the
 * attribute a lie.
 *
 * It has to be a marker because "no type stated" and "this exact type stated"
 * are the same value by transform time, and Markdoc transforms bottom-up so a
 * child cannot ask its parent. An own-property on the Tag rather than an
 * attribute, so `JSON.parse(JSON.stringify(…))` at the serialize boundary drops
 * it and it can never reach the HTML; the applier deletes it once read.
 */
export const SCHEMA_TYPE_EXPLICIT = Symbol.for('refrakt.schemaTypeExplicit');

/** A source name in the rune's flat namespace, mapped to a schema.org property. */
export type PropertyMap = Record<string, string>;

/** A nested entity: its own type, the property that holds it, its own map. */
export interface EntityRow {
	type: string;
	/** The property on the parent that holds this entity. Required — see below. */
	property: string;
	properties?: PropertyMap;
	/** Properties taking a node's own content, via an RDFa-conformant wrapper. */
	text?: PropertyMap;
	/** The wrapper element `text` emits. Defaults to `div`. */
	textTag?: string;
	/** Properties whose value is generated rather than read from content. */
	generated?: Record<string, 'index'>;
}

/** One resolvable schema row: a type plus what it maps. */
export interface SchemaRow {
	type?: string;
	properties?: PropertyMap;
	/**
	 * Properties taking a node's own content. The applier emits the
	 * RDFa-conformant wrapper; no rune hand-writes one.
	 *
	 * The wrapper is conformant, not a workaround. RDFa Core 1.1 §7.5 step 11:
	 * an element carrying both `property` and `typeof` has its object fixed to
	 * the typed resource, so its text is unreachable as a literal. Since
	 * SPEC-082 renders the SEO carriers inline, refrakt publishes RDFa *and*
	 * JSON-LD on the same page — dropping the wrapper would have the two
	 * channels assert different graphs on every accordion, recipe and how-to.
	 */
	text?: PropertyMap;
	/**
	 * The wrapper element `text` emits. Defaults to `div`.
	 *
	 * It is a rendering choice, not a schema one — `how-to` and `recipe` wrap an
	 * `<li>`'s content in a `<p>`, and a `<div>` there would change the page's
	 * margins. Declared rather than fixed so the applier can reproduce what each
	 * rune already renders, byte for byte.
	 */
	textTag?: string;
	entities?: Record<string, EntityRow>;
	/** Properties whose value is generated. `index` is the only generator. */
	generated?: Record<string, 'index'>;
	/**
	 * Properties that always serialise as an array, however many items (D6).
	 *
	 * `readonly` so a table written the way every other one is — a single
	 * `as const` literal — type-checks; nothing here mutates it.
	 */
	lists?: readonly string[];
	/** Per-child-rune type and property remapping. */
	children?: Record<string, EntityRow>;
}

/** A rune's schema table: one row, or a row chosen by an attribute value. */
export interface SchemaTable extends SchemaRow {
	/**
	 * Selects a row by the value of the named **attribute**.
	 *
	 * It names an attribute, not a modifier. `modifiers` is read by the engine,
	 * which has no part in this path — the row is picked here, from `attrs`.
	 * `validateSchemaTable` enforces that the named attribute is declared, so
	 * the ambiguity cannot ship silently.
	 */
	by?: string;
	/** Rows keyed by attribute value, used with `by`. */
	rows?: Record<string, SchemaRow>;
	/** The row for when the `by` attribute is absent or unmatched. */
	fallback?: SchemaRow;
}

/** A problem with a table, found at build time. */
export interface SchemaTableIssue {
	path: string;
	message: string;
}

/**
 * Check a table's internal consistency.
 *
 * Curation, not validation: nothing here checks a mapping against schema.org,
 * because refrakt ships no ontology (D5). What it does check is the structural
 * rule that cannot be got wrong safely — `collectJsonLd` nests a child entity
 * only when the same node carries both `typeof` and `property`, so declaring a
 * child's type without the property that holds it produces a detached
 * top-level entity related to nothing. The table rejects that rather than
 * emitting it.
 */
export function validateSchemaTable(
	table: SchemaTable,
	declaredAttributes: string[] = [],
): SchemaTableIssue[] {
	const issues: SchemaTableIssue[] = [];

	if (table.by !== undefined) {
		if (declaredAttributes.length > 0 && !declaredAttributes.includes(table.by)) {
			issues.push({
				path: 'by',
				message: `\`by: '${table.by}'\` names an attribute the rune does not declare. \`by\` selects a row from \`attrs\`, not from a modifier.`,
			});
		}
		if (!table.rows || Object.keys(table.rows).length === 0) {
			issues.push({ path: 'rows', message: '`by` needs `rows` to select from.' });
		}
		if (!table.fallback && !table.type) {
			issues.push({
				path: 'fallback',
				message: '`by` needs an explicit `fallback` row for the absent or unmatched case.',
			});
		}
	}

	const checkEntities = (rows: Record<string, EntityRow> | undefined, path: string) => {
		for (const [name, row] of Object.entries(rows ?? {})) {
			if (!row.property) {
				issues.push({
					path: `${path}.${name}`,
					message: `A child entity needs the \`property\` that holds it. Without one it floats up as a detached top-level entity: \`collectJsonLd\` nests a typed node only when it also carries \`property\`.`,
				});
			}
			if (!row.type) {
				issues.push({ path: `${path}.${name}`, message: 'A child entity needs a `type`.' });
			}
		}
	};

	const checkRow = (row: SchemaRow, path: string) => {
		checkEntities(row.entities, `${path}entities`);
		checkEntities(row.children, `${path}children`);
	};

	checkRow(table, '');
	for (const [value, row] of Object.entries(table.rows ?? {})) checkRow(row, `rows.${value}.`);
	if (table.fallback) checkRow(table.fallback, 'fallback.');

	return issues;
}

/** Pick the row a set of attributes selects. */
export function selectRow(table: SchemaTable, attrs: Record<string, unknown>): SchemaRow {
	if (!table.by) return table;
	const value = attrs[table.by];
	const row = value === undefined ? undefined : table.rows?.[String(value)];
	return row ?? table.fallback ?? table;
}

// ─── Resolution ───

type AnyTag = InstanceType<typeof Tag>;

const isTag = (n: unknown): n is AnyTag => Markdoc.Tag.isTag(n as never);

/**
 * Find a node by name, whichever attribute carries it.
 *
 * `data-name` and `data-field` are the two surfaces a name can appear on today,
 * and SPEC-133 moves nodes between them. Checking both, in one pass, with no
 * branch on which matched, is what makes those moves a no-op here.
 */
/**
 * Every node bearing a name, in document order, within one rune.
 *
 * **The search stops at another rune's node.** ADR-008's flat namespace is
 * unique *per rune*, so the same name means different things in a parent and in
 * a child it contains: `character` names its title span `name`, and so does
 * every `character-section` inside it. Reaching across that boundary published a
 * character whose `name` was the character plus each of its section headings.
 */
export function findAllByName(
	root: RenderableTreeNode | RenderableTreeNode[],
	name: string,
): AnyTag[] {
	const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	const out: AnyTag[] = [];
	const visit = (node: unknown, top: boolean): void => {
		if (Array.isArray(node)) {
			for (const c of node) visit(c, top);
			return;
		}
		if (!isTag(node)) return;
		const attrs = node.attributes ?? {};
		if (!top && attrs['data-rune'] !== undefined) return;
		const named =
			attrs['data-name'] === name ||
			attrs['data-name'] === kebab ||
			attrs['data-field'] === name ||
			attrs['data-field'] === kebab;
		if (named) {
			out.push(node);
			// A name marks one node, not a subtree: descending into a match would
			// find nothing new and risks a nested re-use of the same name.
			return;
		}
		for (const c of node.children ?? []) visit(c, false);
	};
	visit(root, true);
	return out;
}

/** The first node bearing a name, within one rune — see `findAllByName`. */
export function findByName(
	root: RenderableTreeNode | RenderableTreeNode[],
	name: string,
): AnyTag | undefined {
	return findAllByName(root, name)[0];
}

/** The rune's field bag, as written by `createComponentRenderable`. */
function readBag(root: AnyTag): Record<string, unknown> {
	const raw = root.attributes?.['data-rune-fields'];
	if (typeof raw !== 'string') return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

/**
 * Resolve one source to a carrier and stamp `property` on it.
 *
 * Returns the node that ended up carrying the property, or `undefined` when the
 * source resolves to nothing — which is not an error: a rune legitimately omits
 * optional content, and a row for absent content should emit nothing rather
 * than an empty carrier.
 */
function stamp(
	root: AnyTag,
	bag: Record<string, unknown>,
	source: string,
	property: string,
	sink: AnyTag[],
): AnyTag | undefined {
	// Every node bearing the name, not just the first. A name in the rune's flat
	// namespace can be worn by a whole collection — `recipe` gives each of its
	// ingredient `<li>`s `data-name="ingredient"` — and stamping one of six would
	// publish a single ingredient and silently drop the rest.
	const nodes = findAllByName(root, source);
	if (nodes.length > 0) {
		for (const node of nodes) node.attributes.property = property;
		return nodes[0];
	}
	const value = bag[source];
	if (value === undefined || value === '') return undefined;
	const meta = new Tag('meta', { property, content: carry(value) });
	sink.push(meta);
	return meta;
}

/**
 * Wrap a node's own content so its text is readable as a literal.
 *
 * See the note on `SchemaRow.text` — an element carrying both `property` and
 * `typeof` cannot also contribute its text, so the value needs its own element.
 */
function applyText(root: AnyTag, source: string, property: string, tag = 'div'): void {
	const node = findByName(root, source);
	if (!node) return;
	const wrapper = new Tag(tag, { property }, node.children ?? []);
	node.children = [wrapper];
}

/** Apply a row's own properties, entities and generated values to one node. */
function applyRow(
	node: AnyTag,
	row: SchemaRow,
	bag: Record<string, unknown>,
	index?: number,
): void {
	if (row.type) node.attributes.typeof = row.type;

	// D6 — travel the list declaration to `collectJsonLd`, which derives the
	// graph and has no other way to know a one-item collection is still a list.
	if (row.lists && row.lists.length > 0) {
		node.attributes[SCHEMA_LISTS_ATTR] = JSON.stringify(row.lists);
	}

	const appended: AnyTag[] = [];

	for (const [source, property] of Object.entries(row.properties ?? {})) {
		stamp(node, bag, source, property, appended);
	}

	for (const [source, property] of Object.entries(row.text ?? {})) {
		applyText(node, source, property, row.textTag);
	}

	for (const [property, generator] of Object.entries(row.generated ?? {})) {
		// `index` is the one generator: a position exists nowhere in the content,
		// so it cannot be resolved from a node or the bag.
		if (generator === 'index' && index !== undefined) {
			appended.push(new Tag('meta', { property, content: String(index + 1) }));
		}
	}

	for (const [name, entity] of Object.entries(row.entities ?? {})) {
		const span = buildEntity(node, entity, bag);
		if (span) appended.push(span);
	}

	if (appended.length > 0) node.children = [...(node.children ?? []), ...appended];
}

/**
 * Build a nested entity span, or nothing.
 *
 * D4 — an entity resolving to a bare `@type` with no properties emits nothing.
 * Seven runes in the catalog assert a type and describe nothing; the table
 * makes that a decision rather than an accident.
 */
function buildEntity(
	root: AnyTag,
	entity: EntityRow,
	bag: Record<string, unknown>,
): AnyTag | undefined {
	const carriers: AnyTag[] = [];
	for (const [source, property] of Object.entries(entity.properties ?? {})) {
		const node = findByName(root, source);
		if (node) {
			// The source survives in the output, so the entity takes a copy of its
			// value rather than relocating the node — moving it would change the
			// rendered HTML, which this mechanism must not do.
			const text = textOf(node);
			if (text) carriers.push(new Tag('meta', { property, content: text }));
			continue;
		}
		const value = bag[source];
		if (value !== undefined && value !== '') {
			carriers.push(new Tag('meta', { property, content: carry(value) }));
		}
	}
	if (carriers.length === 0) return undefined;
	return new Tag('span', { typeof: entity.type, property: entity.property }, carriers);
}

/**
 * Carry a bag value onto a `content` attribute without changing its type.
 *
 * `data-rune-fields` stores values typed, and `collectJsonLd` reads `content`
 * straight through — so coercing here would turn a `ratingValue` of `5` into
 * `"5"` in the published JSON-LD. Caught by the baseline: it was the only
 * difference between the hand-built spans and the table.
 */
function carry(value: unknown): string | number | boolean {
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
		return value;
	}
	return String(value);
}

/**
 * Strip every `property=` stamp inside a child the parent is about to retype.
 *
 * Stops at a nested `typeof`: that subtree is its own entity and its properties
 * belong to it, not to the child being retyped.
 */
function clearProperties(node: AnyTag): void {
	const kept: unknown[] = [];
	for (const child of node.children ?? []) {
		if (!isTag(child)) {
			kept.push(child);
			continue;
		}
		const tag = child as AnyTag;
		const attrs = tag.attributes ?? {};
		// A rebuilt carrier — a `<meta property=… content=…>` with no name — exists
		// only to carry a schema value. Stripping its property would leave an inert
		// `<meta>` in the markup, so it goes with the mapping that created it.
		const isCarrier =
			tag.name === 'meta' &&
			attrs.property !== undefined &&
			attrs['data-name'] === undefined &&
			attrs['data-field'] === undefined;
		if (isCarrier) continue;
		if (attrs.property !== undefined) delete tag.attributes.property;
		if (attrs.typeof === undefined) clearProperties(tag);
		kept.push(child);
	}
	node.children = kept as typeof node.children;
}

function textOf(node: unknown): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(textOf).join('');
	if (!isTag(node)) return '';
	const content = (node as AnyTag).attributes?.content;
	if (content !== undefined) return String(content);
	return ((node as AnyTag).children ?? []).map(textOf).join('');
}

/**
 * Apply a rune's schema table to its transform output.
 *
 * Runs on the rune's own root, after its transform has built the tree and
 * `createComponentRenderable` has written the field bag.
 */
export function applySchemaTable(
	output: RenderableTreeNode,
	table: SchemaTable,
	attrs: Record<string, unknown>,
): RenderableTreeNode {
	if (!isTag(output)) return output;
	// `schema="none"` suppresses the whole subtree, not just the root: a child
	// rune declares its own type independently, so stripping only the root would
	// leave orphan typed nodes with no container (WORK-552).
	if (attrs.schema === 'none') return output;

	const root = output as AnyTag;
	const row = selectRow(table, attrs);
	const bag = readBag(root);

	applyRow(root, row, bag);

	// Children are retyped by the parent, never by themselves (D9). Markdoc
	// transforms bottom-up, so by now the children carry their own `typeof` and
	// this rewrites them — and only the parent can supply the `property` that
	// nests them.
	for (const [childName, childRow] of Object.entries(row.children ?? {})) {
		const items = findChildren(root, childName);
		items.forEach((item, i) => {
			// A type the *author* stated is the child's own and survives: a
			// `{% track type="song" %}` inside a podcast stays a song, because
			// saying so and being overruled would make the attribute a lie. A type
			// that came from the child's fallback row is marked implicit, and the
			// parent is the better authority on what an unlabelled child is.
			const marked = item as unknown as Record<symbol, boolean>;
			const ownType = Boolean(marked[SCHEMA_TYPE_EXPLICIT]);
			delete marked[SCHEMA_TYPE_EXPLICIT];

			if (ownType) {
				// A child that kept its own type keeps its own property map with it —
				// the two are one statement, and re-stamping the parent's over it
				// would duplicate every value it already carries. What the parent
				// still supplies is the containing property and anything positional,
				// which only a parent can know.
				applyRow(item, { type: undefined, generated: childRow.generated }, readBag(item), i);
			} else {
				// The parent retypes, so the parent's map is the whole truth for this
				// child. Clearing first is what makes a property that does not belong
				// to the new type disappear rather than linger: `byArtist` on a
				// `PodcastEpisode` is worse than the `MusicRecording` it replaced,
				// which was at least coherently wrong.
				if (childRow.properties) clearProperties(item);
				applyRow(item, childRow, readBag(item), i);
			}
			item.attributes.property = childRow.property;
		});
	}

	return output;
}

/**
 * Every node the named child occupies, in document order.
 *
 * Matched on `data-rune` *or* a name, for the same reason `findByName` is
 * attribute-agnostic: a parent may build some of a collection itself and receive
 * the rest as authored child tags — `playlist` does exactly that, with markdown
 * list items beside `{% track %}` children. Both populations belong to one
 * collection and must take one row, or half of it would go unmapped.
 */
function findChildren(root: AnyTag, name: string): AnyTag[] {
	const out: AnyTag[] = [];
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) {
			for (const c of node) visit(c);
			return;
		}
		if (!isTag(node)) return;
		const attrs = node.attributes ?? {};
		if (attrs['data-rune'] === name || attrs['data-name'] === name || attrs['data-field'] === name)
			out.push(node as AnyTag);
		for (const c of node.children ?? []) visit(c);
	};
	for (const c of root.children ?? []) visit(c);
	return out;
}
