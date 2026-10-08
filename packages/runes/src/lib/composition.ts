/**
 * Composed runes — SPEC-145.
 *
 * A composed rune is defined by a Markdoc template that places its authored
 * content into slots of existing primitive runes. It has no block and ships no
 * CSS (D2); it does own its identity, its field bag and, when it declares them,
 * its schema row and registration (D3).
 *
 * A definition is two halves joined by slot names:
 *
 * ```md
 * ---
 * tag: aside
 * attributes:
 *   from: { type: string, required: true }
 * content:
 *   type: sequence
 *   fields:
 *     body: { match: any, optional: true, greedy: true }
 * ---
 *
 * {% hint type="note" %}
 * **{% $attrs.from %}**
 *
 * {% slot name="body" /%}
 * {% /hint %}
 * ```
 *
 * The frontmatter is the input declaration — SPEC-143's and SPEC-144's
 * vocabulary — and the body is the output template. The rune's name is not in
 * the frontmatter: it is the file's name (SPEC-153 D9), passed in here.
 *
 * ## When the template renders (D4)
 *
 * Where a `transform` would have: after the content model has resolved, at the
 * one call site in `createContentModelSchema`. `compileComposition` checks and
 * parses the template once, at construction, and returns an ordinary transform
 * closure. Per instance, the closure substitutes the resolved fields and the
 * attributes into a copy of the template AST and calls `Markdoc.transform` on it,
 * so every rune the template places runs its own transform unchanged.
 *
 * ## The vocabulary, and nothing more
 *
 * - `{% slot name="x" /%}` places field `x`; with a body, the body is the
 *   fallback for an empty field.
 * - `{% slot name="xs" each %}…{% /slot %}` describes **one** item of a list
 *   field; inside it, a bare `{% slot /%}` is that item's content and `$each`
 *   is bound to its `emitAttributes` (D26).
 * - `$attrs.<name>` is a declared attribute, in content or attribute position.
 * - `{% if %}` / `{% else /%}` are Markdoc's own.
 *
 * ## Markers (D10a, D10c)
 *
 * Every node a slot places carries `data-owner` (the composed rune) and
 * `data-slot` (the slot's name); every node the template places at its top level
 * carries `data-owner`. `data-owner` is bookkeeping and is stripped once the
 * composed rune's own transform finishes (`releaseOwnedNodes`); `data-slot` is
 * the published name of the part. A slot adds no element.
 */
import Markdoc from '@markdoc/markdoc';
import type {
	Config,
	Node,
	RenderableTreeNode,
	RenderableTreeNodes,
	Schema,
	SchemaAttribute,
	Tag,
} from '@markdoc/markdoc';
import yaml from 'yaml';
import type {
	ContentFieldDefinition,
	ContentModel,
	HeadingExtract,
	ResolvedContent,
	SectionsModel,
	SequenceModel,
	StructuralContentModel,
} from '@refrakt-md/types';
import type { RuneConfig } from '@refrakt-md/transform';
import { createComponentRenderable } from './component.js';
import { resolveEmitReference, sectionLookup } from './resolver.js';
import { OWNER_ATTR, SLOT_ATTR, findAllByName } from './schema-table.js';
import type { SchemaTable } from './schema-table.js';
import { SchemaSideTable } from './schema-side-table.js';
import { declareSlotMarkers, declareSlotMarkersOnNodes } from './slot-markers.js';
import { registersSources } from './registers.js';
import type { RegistersDeclaration } from './registers.js';

const { Ast, Tag: MarkdocTag } = Markdoc;

// ---------------------------------------------------------------------------
// The template option on `createContentModelSchema`
// ---------------------------------------------------------------------------

/**
 * A composition template, as `createContentModelSchema` receives it — the third
 * of D5's three mutually exclusive emit paths, beside `transform` and `emits`.
 */
export interface CompositionTemplate {
	/** The composed rune's kebab-case name — its `data-rune`. */
	rune: string;
	/** The root element. */
	tag: string;
	/** Other names the rune answers to. A template placing one of them places itself. */
	aliases?: readonly string[];
	/** The Markdoc template body. */
	body: string;
}

/** One node of a composition's expansion, as the contract records it (D6). */
export interface CompositionOutlineNode {
	/** A rune the template places. */
	rune?: string;
	/** A slot, by name; `''` for a bare `{% slot /%}` inside an `each`. */
	slot?: string;
	/** The slot iterates its field. */
	each?: true;
	/** The slot carries fallback content. */
	fallback?: true;
	/** A Markdoc node the template writes itself (`heading`, `paragraph`, …). */
	node?: string;
	/** `if` — a branch the template takes on an attribute. */
	conditional?: true;
	children?: CompositionOutlineNode[];
}

/** What construction learned about a composition — recorded per schema. */
export interface CompositionInfo {
	rune: string;
	/** Slot names in template order — the composed rune's published part names (D10c). */
	slots: string[];
	/** Every rune the template places, each with the nearest placed rune around it. */
	placements: Array<{ rune: string; parent?: string }>;
	/** The template's structure, for `contracts` (D6). */
	outline: CompositionOutlineNode[];
	/** The schema type the composed rune declares, if any. */
	schemaType?: string;
	/** The generated block-less config (D2a), when built from a definition. */
	config?: RuneConfig;
	/** The config key the engine finds it under. */
	typeName?: string;
}

/** Compositions by schema — the same pattern as `schemaTables`: tooling has only
 *  the schema to read from. */
export const schemaCompositions = new SchemaSideTable<CompositionInfo>();

/** The composition a schema renders, if it is one. */
export function compositionFor(schema: unknown): CompositionInfo | undefined {
	return schema && typeof schema === 'object'
		? schemaCompositions.get(schema as Schema)
		: undefined;
}

/** Tags a template may not contain: they resolve at preprocess, a stage a
 *  template comes after (D4). `include` is the route for a repeated block that
 *  needs one. */
const PREPROCESSOR_TAGS = new Set(['data', 'snippet', 'include']);

/** Markdoc's own tags, which are template vocabulary rather than placed runes. */
const MARKDOC_TAGS = new Set(['if', 'else']);

/** Schema types a placed rune may emit under a composed type: a media object
 *  that becomes a property of the outer entity, not a peer of it (D9). */
export const SUBORDINATE_SCHEMA_TYPES: ReadonlySet<string> = new Set([
	'ImageObject',
	'ImageGallery',
	'VideoObject',
	'AudioObject',
	'MediaObject',
]);

/** A field of the content model, as the slot checks see it. */
interface SlotField {
	/** The field resolves to a list of items, so `each` may iterate it. */
	list: boolean;
	/** The names `$each` exposes for one item: the model's `emitAttributes`. */
	each: string[];
	/** Those `emitAttributes`, name → reference (`$heading`, `$field`, `'$a|$b'`). */
	refs: Record<string, string>;
	/** The field's items are entries of the `sections` arrival mode. */
	sections?: boolean;
}

/**
 * Every field the content model resolves, by name. A composition reads
 * `sequence` and `sections` models; the others are rejected by name rather
 * than half-supported.
 */
function slotFields(
	model: ContentModel | ((attrs: Record<string, any>) => ContentModel),
	fail: (msg: string) => never,
): Map<string, SlotField> {
	const fields = new Map<string, SlotField>();
	const m = typeof model === 'function' ? model({}) : model;
	if ('when' in m) {
		fail(
			'a conditional (`when`) content model is not supported by a composition — the template, not the model, is where an assembly varies.',
		);
	}
	const s = m as StructuralContentModel;
	const addField = (f: ContentFieldDefinition) => {
		const emitted = f.emitTag !== undefined && f.itemModel !== undefined;
		const refs = emitted ? (f.emitAttributes ?? {}) : {};
		fields.set(f.name, { list: !!f.greedy || emitted, each: Object.keys(refs), refs });
	};
	if (s.type === 'sequence') {
		for (const f of s.fields ?? []) addField(f);
	} else if (s.type === 'sections') {
		for (const f of s.fields ?? []) addField(f);
		const refs = s.emitAttributes ?? {};
		fields.set('sections', {
			list: true,
			each: Object.keys(refs),
			refs,
			sections: s.emitTag === undefined,
		});
	} else {
		fail(
			`a \`${s.type}\` content model is not supported by a composition. Declare a \`sequence\` or \`sections\` model, whose fields are the slots.`,
		);
	}
	return fields;
}

// ---------------------------------------------------------------------------
// Template parsing and the construction-time checks
// ---------------------------------------------------------------------------

/**
 * `{% slot name="x" each %}` is the spec's spelling, and Markdoc's tag grammar
 * has no bare boolean attribute. Rewrite it to `each=true` inside slot tags
 * only, outside quoted values, before parsing.
 */
function normaliseEach(body: string): string {
	return body.replace(/\{%-?\s*slot\b([^%]*?)(-?%\})/g, (whole, inner: string, close: string) => {
		let out = '';
		let quote: string | null = null;
		let i = 0;
		while (i < inner.length) {
			const ch = inner[i];
			if (quote) {
				if (ch === '\\') {
					out += inner.slice(i, i + 2);
					i += 2;
					continue;
				}
				if (ch === quote) quote = null;
				out += ch;
				i++;
				continue;
			}
			if (ch === '"' || ch === "'") {
				quote = ch;
				out += ch;
				i++;
				continue;
			}
			const rest = inner.slice(i);
			const m = /^each(?![\w=-])/.exec(rest);
			if (m && (i === 0 || /\s/.test(inner[i - 1]))) {
				out += 'each=true';
				i += m[0].length;
				continue;
			}
			out += ch;
			i++;
		}
		return whole.replace(inner + close, out + close);
	});
}

/** Variables a template node reads, by path, in attribute or content position. */
function variablePaths(value: unknown, out: string[][] = []): string[][] {
	if (!value || typeof value !== 'object') return out;
	const v = value as { $$mdtype?: string; path?: unknown; parameters?: unknown };
	if (v.$$mdtype === 'Variable' && Array.isArray(v.path)) {
		out.push(v.path.map(String));
		return out;
	}
	if (v.$$mdtype === 'Function') {
		variablePaths(v.parameters, out);
		return out;
	}
	if (Array.isArray(value)) {
		for (const x of value) variablePaths(x, out);
		return out;
	}
	if (Object.getPrototypeOf(value) === Object.prototype) {
		for (const x of Object.values(value)) variablePaths(x, out);
	}
	return out;
}

/** Is this node a `{% slot %}` — the composition's own placement tag? */
function isSlotTag(n: Node): boolean {
	return n.type === 'tag' && n.tag === 'slot';
}

/** A paragraph whose only content is one slot tag: a block slot written on its
 *  own line with inline fallback content. */
function soleSlot(n: Node): Node | undefined {
	if (n.type !== 'paragraph' || n.children.length !== 1) return undefined;
	const inline = n.children[0];
	if (inline.type !== 'inline') return undefined;
	const meaningful = inline.children.filter(
		(c) => !(c.type === 'text' && String(c.attributes.content ?? '').trim() === ''),
	);
	return meaningful.length === 1 && isSlotTag(meaningful[0]) ? meaningful[0] : undefined;
}

export interface CompiledComposition {
	/** The transform `createContentModelSchema` calls where it would call `transform`. */
	transform: (
		resolved: ResolvedContent,
		attrs: Record<string, any>,
		config: Config,
		node: Node,
	) => RenderableTreeNodes;
	info: CompositionInfo;
}

export interface CompileCompositionOptions {
	contentModel: ContentModel | ((attrs: Record<string, any>) => ContentModel);
	/** The attributes the rune declares — what `$attrs` may name. */
	attributes: readonly string[];
	/** The rune's schema table, for its declared type (D9). */
	schema?: SchemaTable;
	/** The rune's registration, for D10b's copy into the field bag. */
	registers?: RegistersDeclaration;
}

/**
 * Check a template against the rune's content model and attributes, and build
 * the transform that renders it. Called once, at schema construction. Throws,
 * naming the rune and the offending tag, slot, field or name, rather than
 * building anything it cannot honour.
 */
export function compileComposition(
	template: CompositionTemplate,
	options: CompileCompositionOptions,
): CompiledComposition {
	const { rune, tag, body } = template;
	const fail = (msg: string): never => {
		throw new Error(`Rune "${rune}": invalid composition template — ${msg}`);
	};
	if (typeof body !== 'string') fail('the template body must be a string.');
	if (typeof tag !== 'string' || !/^[a-z][a-z0-9]*$/.test(tag)) {
		fail('`tag` must be an element name.');
	}

	const ast = Markdoc.parse(normaliseEach(body));
	const fields = slotFields(options.contentModel, fail);
	const declared = new Set(options.attributes);
	const selfNames = new Set([rune, ...(template.aliases ?? [])]);

	const placedSlots = new Map<string, Node>();
	const slotOrder: string[] = [];
	const placements: Array<{ rune: string; parent?: string }> = [];

	/** The `each` slot a node sits inside, with what `$each` exposes there. */
	interface Scope {
		each?: { slot: string; fields: string[] };
		parentRune?: string;
	}

	const checkVariables = (n: Node, scope: Scope) => {
		for (const path of variablePaths(n.attributes)) {
			const [root, name] = path;
			if (root === 'attrs') {
				if (name === undefined) fail('`$attrs` must name an attribute, as `$attrs.<name>`.');
				if (!declared.has(name)) {
					fail(
						`\`$attrs.${name}\` names no declared attribute (declared: ${[...declared].join(', ') || 'none'}).`,
					);
				}
			} else if (root === 'each') {
				if (!scope.each) {
					fail(
						`\`$each${name ? `.${name}` : ''}\` is used outside an \`each\` slot; it exists only inside one (D26).`,
					);
				}
				if (name === undefined) fail('`$each` must name a field, as `$each.<name>`.');
				if (!scope.each!.fields.includes(name)) {
					const exposed = scope.each!.fields;
					fail(
						`\`$each.${name}\` names no field of slot \`${scope.each!.slot}\`. \`$each\` exposes exactly the content model's \`emitAttributes\` (${exposed.join(', ') || 'none declared'}) — declare it there (D26).`,
					);
				}
			}
		}
	};

	const outlineOf = (nodes: Node[], scope: Scope): CompositionOutlineNode[] => {
		const out: CompositionOutlineNode[] = [];
		for (const n of nodes) {
			const entry = check(n, scope);
			if (entry) out.push(...entry);
		}
		return out;
	};

	/** Check one template node and return its outline entries. */
	const check = (n: Node, scope: Scope): CompositionOutlineNode[] | undefined => {
		if (n.type === 'error') {
			const errors = (n as unknown as { errors?: Array<{ message?: string }> }).errors ?? [];
			fail(
				`Markdoc could not parse it: ${errors.map((e) => e.message).join('; ') || 'syntax error'}.`,
			);
		}
		checkVariables(n, scope);

		if (isSlotTag(n)) return [checkSlot(n, scope)];

		if (n.type === 'tag' && n.tag) {
			if (PREPROCESSOR_TAGS.has(n.tag)) {
				fail(
					`it contains \`{% ${n.tag} %}\`, which resolves at preprocess, before a template renders (D4). A repeated block that needs \`${n.tag}\` is an \`{% include %}\`, not a composition.`,
				);
			}
			if (MARKDOC_TAGS.has(n.tag)) {
				const children = outlineOf(n.children, scope);
				return n.tag === 'if' ? [{ conditional: true, children }] : children;
			}
			if (selfNames.has(n.tag)) {
				fail(`it places \`{% ${n.tag} %}\`, which is the rune itself — a composition cycle.`);
			}
			placements.push({ rune: n.tag, ...(scope.parentRune ? { parent: scope.parentRune } : {}) });
			const children = outlineOf(n.children, { ...scope, parentRune: n.tag });
			return [{ rune: n.tag, ...(children.length > 0 ? { children } : {}) }];
		}

		const children = outlineOf(n.children, scope);
		// Inline structure is the block's own business; the outline names blocks.
		if (n.inline || n.type === 'inline' || n.type === 'document') return children;
		return [{ node: n.type, ...(children.length > 0 ? { children } : {}) }];
	};

	const checkSlot = (n: Node, scope: Scope): CompositionOutlineNode => {
		const name = n.attributes.name;
		const each = n.attributes.each;
		for (const key of Object.keys(n.attributes)) {
			if (key !== 'name' && key !== 'each') {
				fail(`a \`{% slot %}\` takes \`name\` and \`each\` only, not \`${key}\`.`);
			}
		}
		if (each !== undefined && each !== true) fail('`each` on a slot takes no value.');

		if (name === undefined) {
			if (!scope.each) {
				fail(
					'a bare `{% slot /%}` means "this item\'s content" and is only valid inside an `each` slot. Name the field it places.',
				);
			}
			if (each) fail('a bare `{% slot /%}` cannot itself iterate.');
			if (n.children.length > 0) fail('a bare `{% slot /%}` takes no fallback content.');
			return { slot: '' };
		}
		if (typeof name !== 'string' || name === '') fail('a slot `name` must be a non-empty string.');
		if (scope.each) {
			fail(
				`slot \`${name}\` is placed inside the \`each\` slot \`${scope.each.slot}\`, which would place it once per item. Place it outside.`,
			);
		}
		const field = fields.get(name);
		if (!field) {
			fail(
				`slot \`${name}\` names no field of the content model (fields: ${[...fields.keys()].join(', ') || 'none'}) (D26).`,
			);
		}
		if (placedSlots.has(name)) {
			fail(
				`slot \`${name}\` is placed twice. A slot is placed exactly once; two positions are two declared fields, or a theme's concern (D26).`,
			);
		}
		placedSlots.set(name, n);
		slotOrder.push(name);

		if (each) {
			if (!field!.list) {
				fail(
					`slot \`${name}\` iterates with \`each\`, but field \`${name}\` holds a single value, not a list (D26).`,
				);
			}
			const children = outlineOf(n.children, {
				...scope,
				each: { slot: name, fields: field!.each },
			});
			const sawBare = JSON.stringify(children).includes('"slot":""');
			if (!sawBare) {
				fail(
					`the \`each\` slot \`${name}\` never places its item — a bare \`{% slot /%}\` inside it is the item's content, and without one that content is dropped (D11).`,
				);
			}
			return { slot: name, each: true, ...(children.length > 0 ? { children } : {}) };
		}
		const fallback = outlineOf(n.children, scope);
		return {
			slot: name,
			...(n.children.length > 0 ? { fallback: true as const } : {}),
			...(fallback.length > 0 ? { children: fallback } : {}),
		};
	};

	const outline = outlineOf(ast.children, {});

	// D11 — a field no slot places parses and then silently does not render.
	const unplaced = [...fields.keys()].filter((f) => !placedSlots.has(f));
	if (unplaced.length > 0) {
		fail(
			`content-model field${unplaced.length > 1 ? 's' : ''} ${unplaced.map((f) => `\`${f}\``).join(', ')} ${unplaced.length > 1 ? 'are' : 'is'} placed by no slot, so authored content would be dropped. Place ${unplaced.length > 1 ? 'each' : 'it'} with \`{% slot name="…" /%}\` (D11).`,
		);
	}

	// The type the rune claims — on the table, its fallback, or any of its rows.
	const schemaType =
		options.schema?.type ??
		options.schema?.fallback?.type ??
		Object.values(options.schema?.rows ?? {}).find((r) => r.type)?.type;
	const nodeSources = registersNodeSources(options.registers, fields, declared);

	const info: CompositionInfo = {
		rune,
		slots: slotOrder,
		placements,
		outline,
		...(schemaType ? { schemaType } : {}),
	};

	const attributeNames = [...declared];
	const transform = (
		resolved: ResolvedContent,
		attrs: Record<string, any>,
		config: Config,
	): RenderableTreeNodes => {
		const bound: Record<string, unknown> = {};
		for (const name of attributeNames) bound[name] = attrs[name];
		const ctx: ExpandContext = { rune, resolved, attrs: bound, fields };

		const placed = expand(ast.children, ctx);
		// Top-level template nodes are the composed rune's own (D10). A slot
		// placed at the top level already carries both markers.
		for (const n of placed) {
			if (n.attributes[OWNER_ATTR] === undefined) n.attributes[OWNER_ATTR] = rune;
		}

		const children = Markdoc.transform(placed, markerConfig(config)) as RenderableTreeNode[];

		// The field bag holds every attribute the author set (or that defaulted):
		// it is what `modifiers`, the schema row's attribute sources and
		// registration read.
		const properties: Record<string, Tag> = {};
		for (const name of attributeNames) {
			const value = attrs[name];
			if (value === undefined || value === null) continue;
			properties[name] = new MarkdocTag('meta', { content: value });
		}
		const root = createComponentRenderable({
			rune,
			tag: tag as never,
			properties,
			children,
		});

		copyRegisteredNodes(root, nodeSources);
		return root;
	};

	return { transform, info };
}

// ---------------------------------------------------------------------------
// Substitution — once per instance
// ---------------------------------------------------------------------------

interface ExpandContext {
	rune: string;
	resolved: ResolvedContent;
	attrs: Record<string, unknown>;
	fields: Map<string, SlotField>;
	/** Inside an `each` slot: the slot's name, the item's bindings and content. */
	item?: { slot: string; each: Record<string, unknown>; content: Node[] };
}

function asNodes(value: unknown): Node[] {
	if (Array.isArray(value)) return value as Node[];
	if (value != null) return [value as Node];
	return [];
}

/** A shallow copy of a node: its own attributes, the same children. */
function cloneNode(node: Node, attributes: Record<string, unknown>, children: Node[]): Node {
	const copy = new Ast.Node(node.type, attributes, children, node.tag);
	// The constructor takes four fields; the rest of what the parser sets is
	// carried by hand, as `include` does — `inline` decides how a node renders.
	if (node.lines) copy.lines = node.lines;
	if (node.location) copy.location = node.location;
	copy.inline = node.inline;
	if (node.annotations?.length) copy.annotations = node.annotations;
	if (node.slots && Object.keys(node.slots).length > 0) copy.slots = node.slots;
	return copy;
}

/** Mark a node a slot places. The author's node is never mutated. */
function place(node: Node, owner: string, slot: string): Node {
	return cloneNode(
		node,
		{ ...node.attributes, [OWNER_ATTR]: owner, [SLOT_ATTR]: slot },
		node.children,
	);
}

/** Replace `$attrs.*` and `$each.*` with their values. Any other variable is
 *  page scope and resolves at transform, as in any content. */
function substitute(value: unknown, ctx: ExpandContext): unknown {
	if (!value || typeof value !== 'object') return value;
	const v = value as { $$mdtype?: string; path?: unknown; parameters?: unknown };
	if (v.$$mdtype === 'Variable' && Array.isArray(v.path)) {
		const [root, name] = v.path as string[];
		if (root === 'attrs') return ctx.attrs[name];
		if (root === 'each') return ctx.item?.each[name];
		return value;
	}
	if (v.$$mdtype === 'Function') {
		const copy = Object.assign(Object.create(Object.getPrototypeOf(value)), value);
		copy.parameters = substitute(v.parameters, ctx);
		return copy;
	}
	if (Array.isArray(value)) return value.map((x) => substitute(x, ctx));
	if (Object.getPrototypeOf(value) === Object.prototype) {
		const out: Record<string, unknown> = {};
		for (const [k, x] of Object.entries(value)) out[k] = substitute(x, ctx);
		return out;
	}
	return value;
}

function substituteNode(node: Node, ctx: ExpandContext): Node {
	const attributes: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node.attributes ?? {})) {
		const resolved = substitute(value, ctx);
		// An unset attribute leaves the placed rune's own default in force.
		if (resolved === undefined) {
			if (node.type === 'text' && key === 'content') attributes[key] = '';
			continue;
		}
		attributes[key] = resolved;
	}
	return cloneNode(node, attributes, expand(node.children, ctx));
}

/** The items a list field resolved to, each with its `$each` binding and content. */
function itemsOf(
	field: SlotField,
	value: unknown,
): Array<{ each: Record<string, unknown>; content: Node[] }> {
	return asNodes(value).map((item) => {
		if (field.sections) {
			// A section entry: heading info under `$` keys, then the body's fields.
			// The model has no `emitTag`, so `$each` is resolved here — by the
			// resolver's own rule for the three reference forms (D4a).
			const entry = item as unknown as Record<string, unknown>;
			const extracted: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(entry)) {
				if (k.startsWith('$')) extracted[k.slice(1)] = v;
			}
			const lookup = sectionLookup(String(entry.$heading ?? ''), extracted);
			const each: Record<string, unknown> = {};
			for (const [key, ref] of Object.entries(field.refs)) {
				each[key] = resolveEmitReference(ref, lookup);
			}
			const content = Object.entries(entry)
				.filter(([k]) => !k.startsWith('$'))
				.flatMap(([, v]) => asNodes(v));
			return { each, content };
		}
		// A node — an emitted child tag carries its `emitAttributes` already.
		const node = item as Node;
		const each: Record<string, unknown> = {};
		for (const key of field.each) each[key] = node.attributes?.[key];
		return { each, content: [node] };
	});
}

/** The paragraphs a slot places, opened up so they sit in a line of text. */
function inlineContent(nodes: Node[]): Node[] {
	return nodes.flatMap((n) => {
		if (n.type !== 'paragraph') return [n];
		return n.children.flatMap((c) => (c.type === 'inline' ? c.children : [c]));
	});
}

function expandSlot(slot: Node, ctx: ExpandContext, inline: boolean, block: boolean): Node[] {
	const name = slot.attributes.name as string | undefined;
	let placed: Node[];

	if (name === undefined) {
		const item = ctx.item!;
		placed = item.content.map((n) => place(n, ctx.rune, item.slot));
	} else if (slot.attributes.each === true) {
		const field = ctx.fields.get(name)!;
		placed = [];
		for (const item of itemsOf(field, ctx.resolved[name])) {
			placed.push(
				...expand(slot.children, { ...ctx, item: { slot: name, ...item } }).filter(
					(n) => !(n.type === 'text' && String(n.attributes.content ?? '').trim() === ''),
				),
			);
		}
		return placed;
	} else {
		const nodes = asNodes(ctx.resolved[name]);
		if (nodes.length === 0) {
			// Fallback content is the template's, not the field's: it carries no
			// slot name, so the schema row never reads it as authored content.
			const fallback = expand(slot.children, ctx);
			if (block && fallback.length > 0 && fallback.every((n) => n.inline)) {
				return [new Ast.Node('paragraph', {}, [new Ast.Node('inline', {}, fallback)])];
			}
			return fallback;
		}
		placed = nodes.map((n) => place(n, ctx.rune, name));
	}
	return inline ? inlineContent(placed) : placed;
}

/** Substitute into a list of template nodes, placing slots where they stand. */
function expand(nodes: Node[], ctx: ExpandContext): Node[] {
	const out: Node[] = [];
	for (const n of nodes) {
		if (isSlotTag(n)) {
			out.push(...expandSlot(n, ctx, !!n.inline, !n.inline));
			continue;
		}
		const sole = soleSlot(n);
		if (sole) {
			out.push(...expandSlot(sole, ctx, false, true));
			continue;
		}
		out.push(substituteNode(n, ctx));
	}
	return out;
}

// ---------------------------------------------------------------------------
// Markers and registration
// ---------------------------------------------------------------------------

/**
 * The config a template is transformed against, with the slot markers declared
 * on every schema. A site assembles its config that way already
 * (`assembleMarkdocSchemas`); a config that was not is assembled here, so a
 * marker is never lost to where the transform was called from.
 */
function markerConfig(config: Config): Config {
	const nodes = (config.nodes ?? {}) as Record<string, Schema>;
	const tags = (config.tags ?? {}) as Record<string, Schema>;
	const declared = (s: Schema | undefined) => !!s?.attributes?.[SLOT_ATTR];
	const ready =
		declared(nodes.paragraph) && Object.values(tags).every((s) => !s || declared(s as Schema));
	if (ready) return config;
	return {
		...config,
		tags: declareSlotMarkers(tags),
		nodes: declareSlotMarkersOnNodes(nodes),
	};
}

/** The `registers` sources that name a slot rather than an attribute (D10b). */
function registersNodeSources(
	registers: RegistersDeclaration | undefined,
	fields: Map<string, SlotField>,
	attributes: Set<string>,
): string[] {
	if (!registers) return [];
	const out = new Set<string>();
	for (const { source } of registersSources(registers)) {
		if (fields.has(source) && !attributes.has(source)) out.add(source);
	}
	return [...out];
}

function textOf(node: unknown): string {
	if (typeof node === 'string') return node;
	if (!MarkdocTag.isTag(node as never)) return '';
	return ((node as Tag).children ?? []).map(textOf).join('');
}

/**
 * SPEC-145 D10b — copy each node-sourced `registers` value into the composed
 * rune's own field bag, now, while the slot markers still let the resolvers
 * reach the placed node. Phase 2 reads it from the bag, through the fallback
 * `readRegistersSource` already has; `findRef` and the strip timing are
 * unchanged.
 */
function copyRegisteredNodes(root: Tag, sources: readonly string[]): void {
	if (sources.length === 0) return;
	let bag: Record<string, unknown> = {};
	try {
		bag = JSON.parse(String(root.attributes['data-rune-fields'] ?? '{}'));
	} catch {
		bag = {};
	}
	let changed = false;
	for (const source of sources) {
		if (bag[source] !== undefined) continue;
		const [node] = findAllByName(root, source);
		if (!node) continue;
		bag[source] = textOf(node).trim();
		changed = true;
	}
	if (changed) root.attributes['data-rune-fields'] = JSON.stringify(bag);
}

// ---------------------------------------------------------------------------
// Definitions — frontmatter plus a template
// ---------------------------------------------------------------------------

/**
 * A composed rune's definition, parsed. The template is still source; it is
 * checked and compiled by `createContentModelSchema`.
 */
export interface CompositionDefinition {
	rune: string;
	tag: string;
	aliases?: string[];
	description?: string;
	attributes: Record<string, SchemaAttribute>;
	contentModel: ContentModel;
	schema?: SchemaTable;
	registers?: RegistersDeclaration;
	metaFields?: Record<string, unknown>;
	blocks?: Record<string, unknown>;
	provides?: string[];
	template: string;
}

const DEFINITION_KEYS = new Set([
	'tag',
	'aliases',
	'description',
	'attributes',
	'content',
	'schema',
	'registers',
	'metaFields',
	'blocks',
	'provides',
]);

/** Keys that would give a composed rune styles of its own (D2). */
const STYLE_KEYS = new Set(['css', 'style', 'styles', 'stylesheet', 'block', 'class']);

/** Keys that would declare a second emit path beside the template (D5). */
const EMIT_KEYS = new Set(['transform', 'emits', 'slots']);

const ATTRIBUTE_KEYS = new Set(['type', 'required', 'default', 'matches', 'description']);
const ATTRIBUTE_TYPES: Record<string, SchemaAttribute['type']> = {
	string: String,
	number: Number,
	boolean: Boolean,
};

/**
 * Attribute names the engine already writes as `data-*` on a rune root. An
 * enum attribute becomes a `data-*` modifier (D2a), so one of these would
 * overwrite engine structure.
 */
const RESERVED_MODIFIERS = new Set([
	'name',
	'field',
	'rune',
	'rune-fields',
	'slot',
	'owner',
	'section',
	'zone',
]);

/** kebab-case → PascalCase: the config key the engine finds a rune under. */
export function composedTypeName(rune: string): string {
	return rune
		.split('-')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join('');
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Split and parse a definition. The rune's name is the file's name (SPEC-153
 * D9), passed in; a frontmatter key restating it is rejected rather than
 * silently preferred.
 */
export function parseCompositionDefinition(rune: string, source: string): CompositionDefinition {
	const fail = (msg: string): never => {
		throw new Error(`Rune "${rune}": invalid composition definition — ${msg}`);
	};
	if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(rune)) {
		fail('the rune name must be kebab-case.');
	}
	if (typeof source !== 'string') fail('the definition must be a string.');
	const match = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(source);
	if (!match) fail('it has no frontmatter block (`---` … `---`) declaring its input.');
	let front: unknown;
	try {
		front = yaml.parse(match![1]) ?? {};
	} catch (e) {
		fail(`its frontmatter is not valid YAML: ${(e as Error).message}`);
	}
	if (!front || typeof front !== 'object' || Array.isArray(front)) {
		fail('its frontmatter must be a mapping.');
	}
	const fm = front as Record<string, unknown>;

	for (const key of Object.keys(fm)) {
		if (DEFINITION_KEYS.has(key)) continue;
		if (key === 'rune' || key === 'name') {
			fail(
				`frontmatter key \`${key}\` restates the rune's name, which is the file's name. Remove it (SPEC-153 D9).`,
			);
		}
		if (STYLE_KEYS.has(key)) {
			fail(
				`frontmatter key \`${key}\` would ship styles. A composed rune has no block and ships no CSS: its appearance is the primitives' (D2). A rune that needs its own styling is a declared rune in a plugin.`,
			);
		}
		if (EMIT_KEYS.has(key)) {
			fail(
				`frontmatter key \`${key}\` declares a second emit path. A definition's template is its emit path; exactly one of a slot declaration, a template or a \`transform\` (D5).`,
			);
		}
		if (key === 'layout') {
			fail(
				"frontmatter key `layout` cannot apply: `layout` places a rune's own containers, and a composed rune's containers belong to the primitives it places (D7). Arrange them in the template.",
			);
		}
		fail(`unknown frontmatter key \`${key}\` (expected ${[...DEFINITION_KEYS].join(', ')}).`);
	}

	const tag = (fm.tag ?? 'div') as string;
	if (typeof tag !== 'string' || !/^[a-z][a-z0-9]*$/.test(tag))
		fail('`tag` must be an element name.');

	let aliases: string[] | undefined;
	if (fm.aliases !== undefined) {
		if (!Array.isArray(fm.aliases) || !fm.aliases.every((a) => typeof a === 'string')) {
			fail('`aliases` must be a list of names.');
		}
		aliases = fm.aliases as string[];
	}
	if (fm.description !== undefined && typeof fm.description !== 'string') {
		fail('`description` must be a string.');
	}

	const attributes = parseAttributes(fm.attributes, fail);
	const contentModel = parseContentModel(fm.content, fail);

	for (const key of ['schema', 'registers', 'metaFields', 'blocks'] as const) {
		const v = fm[key];
		if (v !== undefined && (!v || typeof v !== 'object' || Array.isArray(v))) {
			fail(`\`${key}\` must be a mapping.`);
		}
	}
	if (
		fm.provides !== undefined &&
		(!Array.isArray(fm.provides) || !fm.provides.every((p) => typeof p === 'string'))
	) {
		fail('`provides` must be a list of names.');
	}

	return {
		rune,
		tag,
		...(aliases ? { aliases } : {}),
		...(fm.description ? { description: fm.description as string } : {}),
		attributes,
		contentModel,
		...(fm.schema ? { schema: fm.schema as SchemaTable } : {}),
		...(fm.registers ? { registers: fm.registers as RegistersDeclaration } : {}),
		...(fm.metaFields ? { metaFields: fm.metaFields as Record<string, unknown> } : {}),
		...(fm.blocks ? { blocks: fm.blocks as Record<string, unknown> } : {}),
		...(fm.provides ? { provides: fm.provides as string[] } : {}),
		template: match![2],
	};
}

function parseAttributes(
	raw: unknown,
	fail: (msg: string) => never,
): Record<string, SchemaAttribute> {
	if (raw === undefined) return {};
	if (!raw || typeof raw !== 'object' || Array.isArray(raw))
		fail('`attributes` must be a mapping.');
	const out: Record<string, SchemaAttribute> = {};
	for (const [name, decl] of Object.entries(raw as Record<string, unknown>)) {
		const where = `attribute \`${name}\``;
		if (!/^[a-z][a-zA-Z0-9]*(-[a-z0-9]+)*$/.test(name))
			fail(`${where}: not a valid attribute name.`);
		if (!decl || typeof decl !== 'object' || Array.isArray(decl)) {
			fail(`${where} must be a mapping such as \`{ type: string }\`.`);
		}
		const d = decl as Record<string, unknown>;
		for (const key of Object.keys(d)) {
			if (!ATTRIBUTE_KEYS.has(key)) {
				fail(`${where}: unknown key \`${key}\` (expected ${[...ATTRIBUTE_KEYS].join(', ')}).`);
			}
		}
		const type = ATTRIBUTE_TYPES[String(d.type ?? 'string')];
		if (!type) fail(`${where}: \`type\` must be string, number or boolean.`);
		if (d.matches !== undefined) {
			if (!Array.isArray(d.matches) || d.matches.length === 0) {
				fail(`${where}: \`matches\` must be a non-empty list.`);
			}
			if (RESERVED_MODIFIERS.has(kebab(name))) {
				fail(
					`${where} declares \`matches\`, so it would render as \`data-${kebab(name)}\` — an attribute the engine writes itself. Rename it (D2a).`,
				);
			}
		}
		out[name] = {
			type,
			required: d.required === true,
			...(d.default !== undefined ? { default: d.default } : {}),
			...(d.matches !== undefined ? { matches: d.matches as string[] } : {}),
			...(typeof d.description === 'string' ? { description: d.description } : {}),
		} as SchemaAttribute;
	}
	return out;
}

const FIELD_KEYS = new Set([
	'match',
	'optional',
	'greedy',
	'description',
	'itemModel',
	'emitTag',
	'emitAttributes',
]);

/** A field list as YAML writes it: a mapping keyed by name, or a list with `name`. */
function parseFields(
	raw: unknown,
	where: string,
	fail: (msg: string) => never,
): ContentFieldDefinition[] {
	if (raw === undefined) return [];
	const entries: Array<[string, unknown]> = Array.isArray(raw)
		? raw.map((f) => [String((f as Record<string, unknown>)?.name ?? ''), f])
		: raw && typeof raw === 'object'
			? Object.entries(raw)
			: fail(`\`${where}\` must be a mapping of fields.`);
	return entries.map(([name, f]) => {
		if (!/^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$/.test(name)) {
			fail(`\`${where}\`: \`${name}\` is not a valid field name.`);
		}
		if (!f || typeof f !== 'object') fail(`\`${where}.${name}\` must be a mapping.`);
		const def = { ...(f as Record<string, unknown>) };
		delete def.name;
		for (const key of Object.keys(def)) {
			if (!FIELD_KEYS.has(key)) {
				fail(
					`\`${where}.${name}\`: unknown key \`${key}\` (expected ${[...FIELD_KEYS].join(', ')}).`,
				);
			}
		}
		if (typeof def.match !== 'string') fail(`\`${where}.${name}\` needs a \`match\`.`);
		return { name, ...def } as unknown as ContentFieldDefinition;
	});
}

function parseHeadingExtract(raw: unknown, fail: (msg: string) => never): HeadingExtract {
	const fields = (raw as { fields?: unknown })?.fields;
	if (!Array.isArray(fields)) fail('`content.headingExtract.fields` must be a list.');
	return {
		fields: (fields as Array<Record<string, unknown>>).map((f) => {
			if (typeof f?.name !== 'string' || typeof f.pattern !== 'string') {
				fail('a `headingExtract` field needs a `name` and a `pattern`.');
			}
			let pattern: RegExp | 'remainder' = 'remainder';
			if (f.pattern !== 'remainder') {
				try {
					pattern = new RegExp(f.pattern as string);
				} catch (e) {
					fail(
						`headingExtract \`${f.name}\`: \`pattern\` is not a regular expression: ${(e as Error).message}`,
					);
				}
			}
			return {
				name: f.name as string,
				match: 'text' as const,
				pattern,
				...(f.optional === true ? { optional: true } : {}),
			};
		}),
	};
}

const SEQUENCE_KEYS = new Set(['type', 'fields']);
const SECTIONS_KEYS = new Set([
	'type',
	'sectionHeading',
	'fields',
	'preamble',
	'sectionModel',
	'emitTag',
	'emitAttributes',
	'headingExtract',
	'knownSections',
]);

function parseContentModel(raw: unknown, fail: (msg: string) => never): ContentModel {
	if (raw === undefined) return { type: 'sequence', fields: [] };
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('`content` must be a mapping.');
	const c = raw as Record<string, unknown>;
	const allowed =
		c.type === 'sequence' ? SEQUENCE_KEYS : c.type === 'sections' ? SECTIONS_KEYS : null;
	if (!allowed) {
		fail(
			`\`content.type\` must be \`sequence\` or \`sections\`${c.type ? `, not \`${String(c.type)}\`` : ''}: a composition's slots are the model's fields.`,
		);
	}
	for (const key of Object.keys(c)) {
		if (!allowed!.has(key)) {
			fail(`\`content\`: unknown key \`${key}\` for a ${String(c.type)} model.`);
		}
	}
	if (c.type === 'sequence') {
		return {
			type: 'sequence',
			fields: parseFields(c.fields, 'content.fields', fail),
		} as SequenceModel;
	}
	if (c.fields !== undefined && c.preamble !== undefined) {
		fail('`content` declares both `fields` and `preamble`; they are one thing — use `preamble`.');
	}
	const sectionModel =
		c.sectionModel === undefined
			? ({
					type: 'sequence',
					fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
				} as SequenceModel)
			: parseContentModel(c.sectionModel, fail);
	if (c.emitAttributes !== undefined) {
		const ea = c.emitAttributes;
		if (
			!ea ||
			typeof ea !== 'object' ||
			Array.isArray(ea) ||
			!Object.values(ea).every((v) => typeof v === 'string')
		) {
			fail('`content.emitAttributes` must map names to `$heading`, `$<field>` or a literal.');
		}
	}
	return {
		type: 'sections',
		sectionHeading: typeof c.sectionHeading === 'string' ? c.sectionHeading : 'heading',
		fields: parseFields(
			c.preamble ?? c.fields,
			c.preamble ? 'content.preamble' : 'content.fields',
			fail,
		),
		sectionModel,
		...(typeof c.emitTag === 'string' ? { emitTag: c.emitTag } : {}),
		...(c.emitAttributes ? { emitAttributes: c.emitAttributes as Record<string, string> } : {}),
		...(c.headingExtract ? { headingExtract: parseHeadingExtract(c.headingExtract, fail) } : {}),
		...(c.knownSections
			? { knownSections: c.knownSections as SectionsModel['knownSections'] }
			: {}),
	} as SectionsModel;
}

/**
 * The generated, block-less engine config of a composed rune (D2a). Not
 * hand-written beside the definition: modifiers come from its enum attributes,
 * and `metaFields` / `blocks` are carried as declared.
 */
export function composedRuneConfig(def: CompositionDefinition): RuneConfig {
	const modifiers: Record<string, { source: 'meta'; default?: string }> = {};
	for (const [name, attr] of Object.entries(def.attributes)) {
		if (!attr.matches) continue;
		modifiers[name] = {
			source: 'meta',
			...(attr.default !== undefined ? { default: String(attr.default) } : {}),
		};
	}
	return {
		...(Object.keys(modifiers).length > 0 ? { modifiers } : {}),
		...(def.metaFields ? { metaFields: def.metaFields as RuneConfig['metaFields'] } : {}),
		...(def.blocks ? { blocks: def.blocks as RuneConfig['blocks'] } : {}),
		...(def.provides ? { provides: def.provides } : {}),
	} as RuneConfig;
}

// ---------------------------------------------------------------------------
// Checks across the catalog — cycles, peer types, required parents
// ---------------------------------------------------------------------------

/** One rune as the catalog-wide checks see it. */
export interface CompositionCatalogEntry {
	schema?: Schema;
	/** The rune's `data-rune`, when it differs from its tag name (`tabs` renders
	 *  as `tab-group`). What `requiresParent` names. */
	dataRune?: string;
	seoType?: string;
	/** Other names the rune answers to. */
	aliases?: readonly string[];
	/** From the rune's engine config (SPEC-084). */
	requiresParent?: string;
}

/** The schema types a rune can emit at its root — its table's, and its `seoType`. */
function emittedTypes(entry: CompositionCatalogEntry, table: SchemaTable | undefined): string[] {
	return [
		entry.seoType,
		table?.type,
		table?.fallback?.type,
		...Object.values(table?.rows ?? {}).map((r) => r.type),
	].filter((t): t is string => Boolean(t));
}

/**
 * The checks that need every rune in hand: a composition cycle (A places B
 * places A), a composed type placed over a peer type (D9), and a placed rune
 * that requires a parent the template does not give it (D12). Run once the
 * catalog is assembled — by `mergePlugins`, before any page renders — and
 * throws on the first problem, naming the runes involved.
 *
 * D9 is relational: a composition that declares no type of its own may place
 * an entity rune, because then exactly one type exists in the subtree. The
 * check fires only when the composed rune declares a type and a placed rune
 * declares a non-subordinate one.
 */
export function checkCompositions(
	catalog: Record<string, CompositionCatalogEntry>,
	tableOf: (schema: Schema) => SchemaTable | undefined,
): void {
	const byName = new Map<string, { name: string; entry: CompositionCatalogEntry }>();
	for (const [name, entry] of Object.entries(catalog)) {
		byName.set(name, { name, entry });
		for (const alias of entry.aliases ?? []) {
			if (!byName.has(alias)) byName.set(alias, { name, entry });
		}
	}
	const composed = Object.entries(catalog)
		.map(([name, entry]) => ({ name, entry, info: compositionFor(entry.schema) }))
		.filter((c): c is { name: string; entry: CompositionCatalogEntry; info: CompositionInfo } =>
			Boolean(c.info),
		);

	for (const { name, info } of composed) {
		for (const { rune: placedName, parent } of info.placements) {
			const placed = byName.get(placedName);
			if (!placed) continue; // An unknown tag is Markdoc validation's to report.

			const required = placed.entry.requiresParent;
			if (required && required !== '*') {
				const requiredRune = kebab(required);
				const parentEntry = parent ? byName.get(parent) : undefined;
				const parentRune = parent
					? (parentEntry?.entry.dataRune ?? parentEntry?.name ?? parent)
					: undefined;
				if (parentRune !== requiredRune) {
					throw new Error(
						`Rune "${name}": its template places \`{% ${placedName} %}\`, which requires \`{% ${requiredRune} %}\` as its parent, ${parent ? `but sits inside \`{% ${parent} %}\`` : `but the template's nearest rune around it is "${name}" itself`}. Place \`{% ${requiredRune} %}\` and let its content model produce the \`${placed.name}\` children (D12).`,
					);
				}
			}

			if (info.schemaType && placed.entry.schema) {
				const peer = emittedTypes(placed.entry, tableOf(placed.entry.schema)).find(
					(t) => !SUBORDINATE_SCHEMA_TYPES.has(t),
				);
				if (peer) {
					throw new Error(
						`Rune "${name}": it declares schema type \`${info.schemaType}\` and its template places \`{% ${placedName} %}\`, which declares the peer type \`${peer}\`. Two top-level entities in one subtree — compose into a type, never from one: place primitives that emit no type, or a subordinate one such as \`figure\` (D9).`,
					);
				}
			}
		}
	}

	// Cycles: depth-first over the placement graph, composed runes only.
	const edges = new Map<string, string[]>();
	for (const { name, info } of composed) {
		edges.set(
			name,
			info.placements.map((p) => byName.get(p.rune)?.name).filter((n): n is string => Boolean(n)),
		);
	}
	const state = new Map<string, 'visiting' | 'done'>();
	const stack: string[] = [];
	const visit = (name: string): void => {
		if (state.get(name) === 'done') return;
		if (state.get(name) === 'visiting') {
			const cycle = [...stack.slice(stack.indexOf(name)), name];
			throw new Error(
				`Composition cycle: ${cycle.map((n) => `"${n}"`).join(' places ')}. A composed rune cannot place itself, directly or through another.`,
			);
		}
		state.set(name, 'visiting');
		stack.push(name);
		for (const next of edges.get(name) ?? []) if (edges.has(next)) visit(next);
		stack.pop();
		state.set(name, 'done');
	};
	for (const name of edges.keys()) visit(name);
}
