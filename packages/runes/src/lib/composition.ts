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
import { CompositionError } from './composition-errors.js';
import type { CompositionErrorCode } from './composition-errors.js';
import type {
	ContentFieldDefinition,
	ContentModel,
	DelimitedModel,
	DelimitedZone,
	HeadingExtract,
	ItemFieldDefinition,
	ItemModel,
	ResolvedContent,
	SectionsModel,
	SequenceModel,
	StructuralContentModel,
} from '@refrakt-md/types';
import type { RuneConfig } from '@refrakt-md/transform';
import { METABLOCK_ATTR, METABLOCK_OWNER_ATTR } from '@refrakt-md/transform';
import { createComponentRenderable } from './component.js';
import { IMPLICIT_SECTION_KEY, resolveEmitReference, sectionLookup } from './resolver.js';
import { OWNER_ATTR, SLOT_ATTR, findAllByName } from './schema-table.js';
import type { SchemaTable } from './schema-table.js';
import { SchemaSideTable } from './schema-side-table.js';
import { declareSlotMarkers, declareSlotMarkersOnNodes } from './slot-markers.js';
import { registersSources } from './registers.js';
import type { RegistersDeclaration } from './registers.js';
import { parse } from '../parse.js';
import { universalAttributeDefinition } from './universal-attribute-defs.js';
import { moveAttributes, resolvePlacements } from './composition-placement.js';
import type { AxisTarget, CompositionPlacements, TemplateRune } from './composition-placement.js';

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
	/** The `blocks` the rune declares — what `{% metablock %}` may name (D7). */
	blocks?: readonly string[];
	/** D34 — the definition's defaults for universal axes, by attribute. */
	defaults?: Readonly<Record<string, string>>;
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
	/** A declared meta block placed with `{% metablock %}` (D7). */
	metablock?: string;
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
	/** Where each universal axis lands (D33): its placement, the rune it lands
	 *  on, or why it is not offered. For `inspect`, `contracts` and `reference`. */
	axes: Record<string, AxisPlacementInfo>;
	/** D34 — the definition's defaults, each with where it lands and any literal
	 *  the template writes there, which wins over it. */
	defaults?: Record<string, CompositionDefaultInfo>;
}

/** One `defaults` entry, as tooling reads it (D34). */
export interface CompositionDefaultInfo {
	value: string;
	placement: AxisTarget['placement'];
	/** The placed rune it lands on; absent for a root-placed axis. */
	rune?: string;
	/** A literal the template writes on that rune, which the default yields to. */
	literal?: string;
}

/** One axis's placement on a composed rune, as tooling reads it. */
export interface AxisPlacementInfo {
	placement: AxisTarget['placement'];
	/** The placed rune it lands on. */
	rune?: string;
	/** Offered, but dropped with a warning: there is no carrier (D24). */
	dropped?: string;
	/** Not offered, and why (D33.3). */
	unavailable?: string;
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
export { CompositionError, COMPOSITION_ERRORS } from './composition-errors.js';
export type { CompositionErrorCode } from './composition-errors.js';

/**
 * The 0-based line, within a YAML frontmatter block, of the key at `path` —
 * each key searched for after the line its parent was found on. A best-effort
 * locator for error reporting, not a YAML parser: `undefined` when not found.
 */
export function frontmatterKeyLine(
	frontmatter: string,
	path: readonly string[],
): number | undefined {
	const lines = frontmatter.split(/\r?\n/);
	let from = 0;
	let hit: number | undefined;
	for (const key of path) {
		const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp(`^\\s*(?:-\\s+)?["']?${escaped}["']?\\s*:`);
		hit = undefined;
		for (let i = from; i < lines.length; i++) {
			if (re.test(lines[i])) {
				hit = i;
				break;
			}
		}
		if (hit === undefined) return undefined;
		from = hit + 1;
	}
	return hit;
}

const PREPROCESSOR_TAGS = new Set(['data', 'snippet', 'include']);

/** Markdoc's own tags, which are template vocabulary rather than placed runes. */
const MARKDOC_TAGS = new Set(['if', 'else']);

/**
 * The tag a template writes to place one of the rune's declared meta blocks
 * (D7). It is template vocabulary, like `{% slot %}`: it is never registered as
 * a page tag, so on a page it is an undefined tag, and authored slot content
 * cannot reach the marker it renders to.
 */
const METABLOCK_TAG = 'metablock';

/**
 * The key the expanded marker is transformed under. `:` cannot appear in a
 * Markdoc tag name, so no authored `{% … %}` — in a slot or anywhere else —
 * resolves to it: only a template's own `{% metablock %}` becomes a marker.
 */
const METABLOCK_MARKER = 'refrakt:metablock';

/** Renders a `{% metablock %}` to the marker the engine fills (D7). It carries
 *  the block's name and its owner, and nothing else. */
const metablockMarkerSchema: Schema = {
	attributes: { name: { type: String, required: true }, owner: { type: String, required: true } },
	transform(node) {
		return new MarkdocTag('div', {
			[METABLOCK_ATTR]: node.attributes.name,
			[METABLOCK_OWNER_ATTR]: node.attributes.owner,
		});
	},
};

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
	/** The field is one Markdown list, and `each` iterates its items (SPEC-169 D4). */
	listItems?: boolean;
	/** The field may hold several lists, so `each` could not say whose items it
	 *  iterates: `each` on it is an error rather than a guess (SPEC-169 D4). */
	ambiguousList?: boolean;
}

/** `match` alternatives that are a Markdown list. */
const LIST_MATCHES = new Set(['list', 'list:ordered', 'list:unordered']);

/** A fail that may locate itself at a key path under `content`. */
type ModelFail = (code: CompositionErrorCode, msg: string, at?: readonly string[]) => never;

/**
 * SPEC-169 D1 — what a composition accepts of a delimited model: `hr` as the
 * delimiter, fixed zones, and each field name in one zone only, because the
 * slots are the union of the zones' fields. Shared by the definition parser
 * (which can locate the key) and the template compiler (which also sees a
 * model handed to it in code).
 */
function checkDelimitedModel(m: DelimitedModel, fail: ModelFail): void {
	if (m.dynamicZones) {
		fail(
			'dynamic-zones',
			'a delimited model with `dynamicZones` is not supported by a composition: its zones have no fixed names, so a template has nothing to place. Declare fixed `zones` (SPEC-169 D1).',
			['dynamicZones'],
		);
	}
	if (m.delimiter !== 'hr') {
		fail(
			'delimiter-unsupported',
			`a delimited model splits on \`hr\` (\`---\`) only, not \`${String(m.delimiter)}\` (SPEC-169 D1).`,
			['delimiter'],
		);
	}
	if (!Array.isArray(m.zones) || m.zones.length === 0) {
		fail('content-model-invalid', 'a delimited model needs a non-empty list of `zones`.', [
			'zones',
		]);
	}
	const owner = new Map<string, string>();
	for (const zone of m.zones!) {
		for (const f of zone.fields ?? []) {
			const first = owner.get(f.name);
			if (first !== undefined) {
				fail(
					'zone-field-twice',
					`field \`${f.name}\` is declared in zone \`${first}\` and in zone \`${zone.name}\`. A composition's slots are the union of the zones' fields, so a name belongs to one zone (SPEC-169 D1).`,
					['zones', f.name],
				);
			}
			owner.set(f.name, zone.name);
		}
	}
}

/** SPEC-169 D3 — an implicit section binds `$each` exactly as a real one does. */
function checkImplicitSection(m: SectionsModel, fail: ModelFail): void {
	if (!m.implicitSection) return;
	const given = Object.keys(m.implicitSection.attributes ?? {}).sort();
	const emitted = Object.keys(m.emitAttributes ?? {}).sort();
	if (given.join('\0') !== emitted.join('\0')) {
		const missing = emitted.filter((k) => !given.includes(k));
		const extra = given.filter((k) => !emitted.includes(k));
		fail(
			'implicit-section-mismatch',
			`\`implicitSection.attributes\` must give exactly the keys of \`emitAttributes\` (${emitted.join(', ') || 'none'}), so \`$each\` is bound the same way for a real and an implicit section${missing.length ? `; missing ${missing.map((k) => `\`${k}\``).join(', ')}` : ''}${extra.length ? `; not emitted ${extra.map((k) => `\`${k}\``).join(', ')}` : ''} (SPEC-169 D3).`,
			['implicitSection'],
		);
	}
}

/**
 * Every field the content model resolves, by name. A composition reads
 * `sequence`, `sections` and fixed-zone `delimited` models; the others are
 * rejected by name rather than half-supported.
 */
function slotFields(
	model: ContentModel | ((attrs: Record<string, any>) => ContentModel),
	fail: (code: CompositionErrorCode, msg: string) => never,
): Map<string, SlotField> {
	const fields = new Map<string, SlotField>();
	const m = typeof model === 'function' ? model({}) : model;
	if ('when' in m) {
		fail(
			'content-model-type',
			'a conditional (`when`) content model is not supported by a composition — the template, not the model, is where an assembly varies. Each case has a declarative form: `implicitSection` on a sections model, `each` over a list field, or a template that places every alternative, with an empty one rendering nothing (SPEC-169 D2).',
		);
	}
	const s = m as StructuralContentModel;
	const addField = (f: ContentFieldDefinition) => {
		const emitted = f.emitTag !== undefined && f.itemModel !== undefined;
		const refs = emitted ? (f.emitAttributes ?? {}) : {};
		const alternatives = f.match.split('|');
		const listOnly = alternatives.every((a) => LIST_MATCHES.has(a));
		const listItems = !emitted && !f.greedy && listOnly;
		const ambiguousList = !emitted && !!f.greedy && alternatives.some((a) => LIST_MATCHES.has(a));
		fields.set(f.name, {
			list: !!f.greedy || emitted || listItems,
			each: Object.keys(refs),
			refs,
			...(listItems ? { listItems } : {}),
			...(ambiguousList ? { ambiguousList } : {}),
		});
	};
	if (s.type === 'sequence') {
		for (const f of s.fields ?? []) addField(f);
	} else if (s.type === 'sections') {
		checkImplicitSection(s, fail);
		for (const f of s.fields ?? []) addField(f);
		const refs = s.emitAttributes ?? {};
		fields.set('sections', {
			list: true,
			each: Object.keys(refs),
			refs,
			sections: s.emitTag === undefined,
		});
	} else if (s.type === 'delimited') {
		checkDelimitedModel(s, fail);
		for (const zone of s.zones ?? []) for (const f of zone.fields ?? []) addField(f);
	} else {
		fail(
			'content-model-type',
			`a \`${s.type}\` content model is not supported by a composition. Declare a \`sequence\`, \`sections\` or \`delimited\` model, whose fields are the slots.`,
		);
	}
	return fields;
}

/**
 * The resolved fields a template's slots read. A delimited model resolves each
 * zone to its own record; its slots are the zones' fields, so the zones are
 * merged — `checkDelimitedModel` has made their names disjoint.
 */
function slotValues(model: StructuralContentModel, resolved: ResolvedContent): ResolvedContent {
	if (model.type !== 'delimited') return resolved;
	const out: ResolvedContent = {};
	for (const zone of model.zones ?? []) {
		Object.assign(out, (resolved[zone.name] as ResolvedContent | undefined) ?? {});
	}
	return out;
}

// ---------------------------------------------------------------------------
// Template parsing and the construction-time checks
// ---------------------------------------------------------------------------

/**
 * `{% slot name="x" each %}` and `{% section chrome %}` are the spec's
 * spellings (D26, D31), and Markdoc's tag grammar has no bare boolean
 * attribute. Rewrite `each` inside slot tags, and `chrome` inside any tag, to
 * `=true`, outside quoted values, before parsing.
 */
export function normaliseEach(body: string): string {
	return body.replace(
		/\{%-?\s*([a-z][\w-]*)\b([^%]*?)(-?%\})/g,
		(whole, tag: string, inner: string, close: string) => {
			const bare = tag === 'slot' ? ['each', 'chrome'] : ['chrome'];
			const out = bareToTrue(inner, bare);
			return out === inner ? whole : whole.replace(inner + close, out + close);
		},
	);
}

/** Rewrite each bare word in `words` to `word=true`, outside quoted values. */
function bareToTrue(inner: string, words: readonly string[]): string {
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
		if (i === 0 || /\s/.test(inner[i - 1])) {
			const rest = inner.slice(i);
			const word = words.find((w) => new RegExp(`^${w}(?![\\w=-])`).test(rest));
			if (word) {
				out += `${word}=true`;
				i += word.length;
				continue;
			}
		}
		out += ch;
		i++;
	}
	return out;
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
	/**
	 * The template expanded for one instance: what `transform` hands Markdoc,
	 * before it is transformed. Validation reads it to see which slot each
	 * placed node came from (ADR-046 decision 3).
	 */
	place: (resolved: ResolvedContent, attrs: Record<string, any>) => Node[];
	/** Where the universal attributes land (D14, D31, D33). */
	placements: CompositionPlacements;
	/** One instance's attributes less the universal ones that moved off the root
	 *  (or were dropped for want of a carrier). What the root keeps. */
	rootAttributes: (attrs: Record<string, any>) => Record<string, any>;
	/** The parsed template, as construction checked it. */
	templateNodes: readonly Node[];
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
	/** The template node being checked, so a failure can say where it is. */
	let current: Node | undefined;
	const fail = (code: CompositionErrorCode, msg: string): never => {
		const err = new CompositionError(code, `Rune "${rune}": invalid composition template — ${msg}`);
		const line = current?.lines?.[0];
		if (typeof line === 'number') err.bodyLine = line;
		throw err;
	};
	if (typeof body !== 'string') fail('invalid-value', 'the template body must be a string.');
	if (typeof tag !== 'string' || !/^[a-z][a-z0-9]*$/.test(tag)) {
		fail('invalid-value', '`tag` must be an element name.');
	}

	const ast = parse(normaliseEach(body));
	const fields = slotFields(options.contentModel, fail);
	const structural = (
		typeof options.contentModel === 'function' ? options.contentModel({}) : options.contentModel
	) as StructuralContentModel;
	const declared = new Set(options.attributes);
	const selfNames = new Set([rune, ...(template.aliases ?? [])]);

	const placedSlots = new Map<string, Node>();
	const slotOrder: string[] = [];
	const placements: Array<{ rune: string; parent?: string }> = [];
	/** Every rune the template places, for the paint carrier and role owners. */
	const templateRunes: TemplateRune[] = [];

	/** The `each` slot a node sits inside, with what `$each` exposes there. */
	interface Scope {
		each?: { slot: string; fields: string[] };
		parentRune?: string;
	}

	const checkVariables = (n: Node, scope: Scope) => {
		for (const path of variablePaths(n.attributes)) {
			const [root, name] = path;
			if (root === 'attrs') {
				if (name === undefined)
					fail('attrs-undeclared', '`$attrs` must name an attribute, as `$attrs.<name>`.');
				if (!declared.has(name)) {
					fail(
						'attrs-undeclared',
						`\`$attrs.${name}\` names no declared attribute (declared: ${[...declared].join(', ') || 'none'}).`,
					);
				}
			} else if (root === 'each') {
				if (!scope.each) {
					fail(
						'each-outside-slot',
						`\`$each${name ? `.${name}` : ''}\` is used outside an \`each\` slot; it exists only inside one (D26).`,
					);
				}
				if (name === undefined)
					fail('each-field-not-emitted', '`$each` must name a field, as `$each.<name>`.');
				if (!scope.each!.fields.includes(name)) {
					const exposed = scope.each!.fields;
					fail(
						'each-field-not-emitted',
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
		const parent = current;
		current = n.lines?.length ? n : current;
		try {
			return checkNode(n, scope);
		} finally {
			current = parent;
		}
	};
	const checkNode = (n: Node, scope: Scope): CompositionOutlineNode[] | undefined => {
		// A syntax error is an `error` node; an unclosed or unopened tag parses as
		// a tag carrying a critical error, and would otherwise build silently.
		const errors = (n as unknown as { errors?: Array<{ message?: string; level?: string }> })
			.errors;
		if (n.type === 'error' || errors?.some((e) => e.level === 'critical')) {
			fail(
				'template-parse',
				`Markdoc could not parse it: ${(errors ?? []).map((e) => e.message).join('; ') || 'syntax error'}.`,
			);
		}
		checkVariables(n, scope);

		if (isSlotTag(n)) return [checkSlot(n, scope)];
		if (n.type === 'tag' && n.tag === METABLOCK_TAG) return [checkMetablock(n, scope)];

		if (n.type === 'tag' && n.tag) {
			if (PREPROCESSOR_TAGS.has(n.tag)) {
				fail(
					'preprocessor-tag',
					`it contains \`{% ${n.tag} %}\`, which resolves at preprocess, before a template renders (D4). A repeated block that needs \`${n.tag}\` is an \`{% include %}\`, not a composition.`,
				);
			}
			if (MARKDOC_TAGS.has(n.tag)) {
				const children = outlineOf(n.children, scope);
				return n.tag === 'if' ? [{ conditional: true, children }] : children;
			}
			if (selfNames.has(n.tag)) {
				fail(
					'composition-cycle',
					`it places \`{% ${n.tag} %}\`, which is the rune itself — a composition cycle.`,
				);
			}
			placements.push({ rune: n.tag, ...(scope.parentRune ? { parent: scope.parentRune } : {}) });
			templateRunes.push({ node: n, top: !scope.parentRune, inEach: !!scope.each });
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
				fail('slot-invalid', `a \`{% slot %}\` takes \`name\` and \`each\` only, not \`${key}\`.`);
			}
		}
		if (each !== undefined && each !== true)
			fail('slot-invalid', '`each` on a slot takes no value.');

		if (name === undefined) {
			if (!scope.each) {
				fail(
					'bare-slot-misplaced',
					'a bare `{% slot /%}` means "this item\'s content" and is only valid inside an `each` slot. Name the field it places.',
				);
			}
			if (each) fail('slot-invalid', 'a bare `{% slot /%}` cannot itself iterate.');
			if (n.children.length > 0)
				fail('slot-invalid', 'a bare `{% slot /%}` takes no fallback content.');
			return { slot: '' };
		}
		if (typeof name !== 'string' || name === '')
			fail('slot-invalid', 'a slot `name` must be a non-empty string.');
		if (scope.each) {
			fail(
				'slot-inside-each',
				`slot \`${name}\` is placed inside the \`each\` slot \`${scope.each.slot}\`, which would place it once per item. Place it outside.`,
			);
		}
		const field = fields.get(name);
		if (!field) {
			fail(
				'slot-unknown-field',
				`slot \`${name}\` names no field of the content model (fields: ${[...fields.keys()].join(', ') || 'none'}) (D26).`,
			);
		}
		if (placedSlots.has(name)) {
			fail(
				'slot-placed-twice',
				`slot \`${name}\` is placed twice. A slot is placed exactly once; two positions are two declared fields, or a theme's concern (D26).`,
			);
		}
		placedSlots.set(name, n);
		slotOrder.push(name);

		if (each) {
			if (field!.ambiguousList) {
				fail(
					'each-on-list-ambiguous',
					`slot \`${name}\` iterates with \`each\`, but field \`${name}\` is greedy and can collect several lists, so it is unclear whose items are meant. Make it a non-greedy field matching one list, whose items \`each\` then iterates (SPEC-169 D4).`,
				);
			}
			if (!field!.list) {
				fail(
					'each-on-single-field',
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
					'each-item-unplaced',
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

	const declaredBlocks = new Set(template.blocks ?? []);
	const placedBlocks = new Set<string>();

	/** D7 — a meta block placement: a declared block, placed once, standing on
	 *  its own line. Its values resolve two stages later, in the engine. */
	function checkMetablock(n: Node, scope: Scope): CompositionOutlineNode {
		for (const key of Object.keys(n.attributes)) {
			if (key !== 'name') {
				fail('metablock-invalid', `a \`{% metablock %}\` takes \`name\` only, not \`${key}\`.`);
			}
		}
		const name = n.attributes.name;
		if (typeof name !== 'string' || name === '') {
			fail(
				'metablock-invalid',
				'a `{% metablock %}` needs a `name`: the declared block it places.',
			);
		}
		if (n.children.length > 0) {
			fail(
				'metablock-invalid',
				`\`{% metablock name="${name}" %}\` takes no content; write it self-closing.`,
			);
		}
		if (n.inline) {
			fail(
				'metablock-invalid',
				`\`{% metablock name="${name}" /%}\` sits inside a line of text. A meta block is a block; place it on its own line.`,
			);
		}
		if (scope.each) {
			fail(
				'metablock-inside-each',
				`\`{% metablock name="${name}" /%}\` is placed inside the \`each\` slot \`${scope.each.slot}\`, which would place it once per item. Place it outside (D7).`,
			);
		}
		if (!declaredBlocks.has(name as string)) {
			fail(
				'metablock-undeclared',
				`\`{% metablock name="${name}" /%}\` names no declared block (declared: ${[...declaredBlocks].join(', ') || 'none'}). Declare it under \`blocks\` (D7).`,
			);
		}
		if (placedBlocks.has(name as string)) {
			fail(
				'metablock-placed-twice',
				`meta block \`${name}\` is placed twice. A block is placed exactly once: two placements would give two nodes one \`data-name\` (D7).`,
			);
		}
		placedBlocks.add(name as string);
		return { metablock: name as string };
	}

	const outline = outlineOf(ast.children, {});

	// D14, D31, D33 — the paint carrier and every axis's target.
	const plan = resolvePlacements(rune, templateRunes, (code, msg, at) => {
		current = at ?? current;
		return fail(code, msg);
	});
	current = undefined;

	// D34 — each default lands where the author's attribute would. One that
	// lands nowhere is a definition error, not a silent no-op.
	const defaultsByNode = new Map<Node, Record<string, unknown>>();
	const defaultInfo: Record<string, CompositionDefaultInfo> = {};
	for (const [name, value] of Object.entries(template.defaults ?? {})) {
		const target: AxisTarget | undefined =
			name === 'density'
				? plan.carrier
					? { placement: 'carrier', node: plan.carrier, rune: plan.carrier.tag! }
					: { placement: 'carrier', dropped: `\`${rune}\` places no rune to carry it` }
				: plan.axes[plan.axisOf[name]];
		if (!target) continue;
		if (target.placement === 'root') {
			defaultInfo[name] = { value, placement: 'root' };
			continue;
		}
		if (!('node' in target)) {
			const why = 'dropped' in target ? target.dropped : target.unavailable;
			throw new CompositionError(
				'defaults-invalid',
				`Rune "${rune}": \`defaults.${name}\` lands nowhere: ${why} (D34).`,
			);
		}
		const into = defaultsByNode.get(target.node) ?? {};
		into[name] = value;
		defaultsByNode.set(target.node, into);
		const literal = target.node.attributes[name];
		defaultInfo[name] = {
			value,
			placement: target.placement,
			rune: target.rune,
			...(literal !== undefined && typeof literal !== 'object' ? { literal: String(literal) } : {}),
		};
	}

	// D11 — a field no slot places parses and then silently does not render.
	const unplaced = [...fields.keys()].filter((f) => !placedSlots.has(f));
	if (unplaced.length > 0) {
		fail(
			'field-unplaced',
			`content-model field${unplaced.length > 1 ? 's' : ''} ${unplaced.map((f) => `\`${f}\``).join(', ')} ${unplaced.length > 1 ? 'are' : 'is'} placed by no slot, so authored content would be dropped. Place ${unplaced.length > 1 ? 'each' : 'it'} with \`{% slot name="…" /%}\` (D11).`,
		);
	}

	// The type the rune claims — on the table, its fallback, or any of its rows.
	const schemaType =
		options.schema?.type ??
		options.schema?.fallback?.type ??
		Object.values(options.schema?.rows ?? {}).find((r) => r.type)?.type;
	const nodeSources = registersNodeSources(options.registers, fields, declared);

	const axes: Record<string, AxisPlacementInfo> = {};
	for (const [axis, target] of Object.entries(plan.axes)) {
		axes[axis] = {
			placement: target.placement,
			...('rune' in target ? { rune: target.rune } : {}),
			...('dropped' in target ? { dropped: target.dropped } : {}),
			...('unavailable' in target ? { unavailable: target.unavailable } : {}),
		};
	}
	const info: CompositionInfo = {
		rune,
		slots: slotOrder,
		placements,
		outline,
		axes,
		...(Object.keys(defaultInfo).length > 0 ? { defaults: defaultInfo } : {}),
		...(schemaType ? { schemaType } : {}),
	};

	const attributeNames = [...declared];
	const place = (resolved: ResolvedContent, attrs: Record<string, any>): Node[] => {
		const bound: Record<string, unknown> = {};
		for (const name of attributeNames) bound[name] = attrs[name];
		const ctx: ExpandContext = {
			rune,
			resolved: slotValues(structural, resolved),
			attrs: bound,
			fields,
			moves: moveAttributes(plan, attrs).moves,
			defaults: defaultsByNode,
		};

		const placed = expand(ast.children, ctx);
		// Top-level template nodes are the composed rune's own (D10). A slot
		// placed at the top level already carries both markers.
		for (const n of placed) {
			if (n.attributes[OWNER_ATTR] === undefined) n.attributes[OWNER_ATTR] = rune;
		}
		return placed;
	};
	const transform = (
		resolved: ResolvedContent,
		attrs: Record<string, any>,
		config: Config,
	): RenderableTreeNodes => {
		const placed = place(resolved, attrs);

		const children = Markdoc.transform(placed, templateConfig(config)) as RenderableTreeNode[];

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

	const rootAttributes = (attrs: Record<string, any>): Record<string, any> => {
		const { moved } = moveAttributes(plan, attrs);
		if (moved.size === 0) return attrs;
		const out: Record<string, any> = {};
		for (const [name, value] of Object.entries(attrs)) if (!moved.has(name)) out[name] = value;
		return out;
	};

	return {
		transform,
		info,
		place,
		placements: plan,
		rootAttributes,
		templateNodes: ast.children,
	};
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
	/** Universal attributes the author wrote, by the template node they land on
	 *  (D14, D33). The author's value replaces the template's literal. */
	moves?: Map<Node, Record<string, unknown>>;
	/** D34 — the definition's defaults, by the template node they land on. They
	 *  fill only what neither the author nor a template literal set. */
	defaults?: Map<Node, Record<string, unknown>>;
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
	if (node.type === 'tag') {
		// D31 — the marker is the template's, consumed here: it reaches neither
		// the placed rune's attributes nor the HTML.
		delete attributes.chrome;
		// D34.3 — author > template literal > definition default.
		for (const [name, value] of Object.entries(ctx.defaults?.get(node) ?? {})) {
			if (attributes[name] === undefined) attributes[name] = value;
		}
		const moved = ctx.moves?.get(node);
		if (moved) Object.assign(attributes, moved);
	}
	return cloneNode(node, attributes, expand(node.children, ctx));
}

/** The items a list field resolved to, each with its `$each` binding and content. */
function itemsOf(
	field: SlotField,
	value: unknown,
): Array<{ each: Record<string, unknown>; content: Node[] }> {
	if (field.listItems) {
		// SPEC-169 D4 — one Markdown list: each item is placed as it is, with no
		// extraction, so `$each` binds nothing. A tight item's text is an `inline`
		// node; it is given the paragraph a loose item would have had.
		return asNodes(value)
			.flatMap((list) => (list.type === 'list' ? list.children : []))
			.filter((item) => item.type === 'item')
			.map((item) => ({
				each: {},
				content: item.children.map((c) =>
					c.type === 'inline' ? new Ast.Node('paragraph', {}, [c]) : c,
				),
			}));
	}
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
			// An implicit section (SPEC-169 D3) has no heading to read: its
			// declared attributes are the values, under the same keys.
			const implicit = entry[IMPLICIT_SECTION_KEY] as Record<string, unknown> | undefined;
			const each: Record<string, unknown> = {};
			for (const [key, ref] of Object.entries(field.refs)) {
				each[key] = implicit ? implicit[key] : resolveEmitReference(ref, lookup);
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
		if (n.type === 'tag' && n.tag === METABLOCK_TAG) {
			out.push(
				new Ast.Node('tag', { name: n.attributes.name, owner: ctx.rune }, [], METABLOCK_MARKER),
			);
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

/** The config a template renders against: the slot markers declared, and the
 *  meta block marker resolvable — for the template's own `{% metablock %}`
 *  only, since nothing authored can name its key. */
function templateConfig(config: Config): Config {
	const marked = markerConfig(config);
	return { ...marked, tags: { ...marked.tags, [METABLOCK_MARKER]: metablockMarkerSchema } };
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
	/** D34 — defaults for universal axes, by attribute name. */
	defaults?: Record<string, string>;
	template: string;
	/** 1-based line of the source on which the template body starts. */
	templateLine: number;
	/** The frontmatter block's text, for locating a key in error reports. */
	frontmatter: string;
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
	'defaults',
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
	let frontmatter = '';
	/** Throw, located at the frontmatter key `at` names when it is given. */
	const fail = (
		code: CompositionErrorCode,
		msg: string,
		at?: readonly string[] | number,
	): never => {
		const err = new CompositionError(
			code,
			`Rune "${rune}": invalid composition definition — ${msg}`,
		);
		const index =
			typeof at === 'number' ? at : at ? frontmatterKeyLine(frontmatter, at) : undefined;
		// The frontmatter's first line is the source's second, after `---`.
		err.line = index === undefined ? 1 : index + 2;
		throw err;
	};
	if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(rune)) {
		fail('name-not-kebab', 'the rune name must be kebab-case.');
	}
	if (typeof source !== 'string') fail('invalid-value', 'the definition must be a string.');
	const match = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(source);
	if (!match)
		fail('no-frontmatter', 'it has no frontmatter block (`---` … `---`) declaring its input.');
	frontmatter = match![1];
	let front: unknown;
	try {
		front = yaml.parse(frontmatter) ?? {};
	} catch (e) {
		const pos = (e as { linePos?: Array<{ line: number }> }).linePos?.[0]?.line;
		fail(
			'frontmatter-yaml',
			`its frontmatter is not valid YAML: ${(e as Error).message}`,
			typeof pos === 'number' ? pos - 1 : undefined,
		);
	}
	if (!front || typeof front !== 'object' || Array.isArray(front)) {
		fail('frontmatter-yaml', 'its frontmatter must be a mapping.');
	}
	const fm = front as Record<string, unknown>;

	for (const key of Object.keys(fm)) {
		if (DEFINITION_KEYS.has(key)) continue;
		if (key === 'rune' || key === 'name') {
			fail(
				'name-restated',
				`frontmatter key \`${key}\` restates the rune's name, which is the file's name. Remove it (SPEC-153 D9).`,
				[key],
			);
		}
		if (STYLE_KEYS.has(key)) {
			fail(
				'style-key',
				`frontmatter key \`${key}\` would ship styles. A composed rune has no block and ships no CSS: its appearance is the primitives' (D2). A rune that needs its own styling is a declared rune in a plugin.`,
				[key],
			);
		}
		if (EMIT_KEYS.has(key)) {
			fail(
				'second-emit-path',
				`frontmatter key \`${key}\` declares a second emit path. A definition's template is its emit path; exactly one of a slot declaration, a template or a \`transform\` (D5).`,
				[key],
			);
		}
		if (key === 'layout') {
			fail(
				'layout-key',
				"frontmatter key `layout` cannot apply: `layout` places a rune's own containers, and a composed rune's containers belong to the primitives it places (D7). Arrange them in the template.",
				[key],
			);
		}
		fail(
			'unknown-key',
			`unknown frontmatter key \`${key}\` (expected ${[...DEFINITION_KEYS].join(', ')}).`,
			[key],
		);
	}

	const tag = (fm.tag ?? 'div') as string;
	if (typeof tag !== 'string' || !/^[a-z][a-z0-9]*$/.test(tag))
		fail('invalid-value', '`tag` must be an element name.', ['tag']);

	let aliases: string[] | undefined;
	if (fm.aliases !== undefined) {
		if (!Array.isArray(fm.aliases) || !fm.aliases.every((a) => typeof a === 'string')) {
			fail('invalid-value', '`aliases` must be a list of names.', ['aliases']);
		}
		aliases = fm.aliases as string[];
	}
	if (fm.description !== undefined && typeof fm.description !== 'string') {
		fail('invalid-value', '`description` must be a string.', ['description']);
	}

	const attributes = parseAttributes(fm.attributes, (code, msg, at) =>
		fail(code, msg, ['attributes', ...(at ?? [])]),
	);
	const contentModel = parseContentModel(fm.content, (code, msg, at) =>
		fail(code, msg, ['content', ...(at ?? [])]),
	);

	for (const key of ['schema', 'registers', 'metaFields', 'blocks'] as const) {
		const v = fm[key];
		if (v !== undefined && (!v || typeof v !== 'object' || Array.isArray(v))) {
			fail('invalid-value', `\`${key}\` must be a mapping.`, [key]);
		}
	}
	if (
		fm.provides !== undefined &&
		(!Array.isArray(fm.provides) || !fm.provides.every((p) => typeof p === 'string'))
	) {
		fail('invalid-value', '`provides` must be a list of names.', ['provides']);
	}
	const defaults = parseDefaults(fm.defaults, (code, msg, at) =>
		fail(code, msg, ['defaults', ...(at ?? [])]),
	);

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
		...(defaults ? { defaults } : {}),
		template: match![2],
		// `---`, the frontmatter's lines, `---`: the body starts on the next.
		templateLine: frontmatter.split(/\r?\n/).length + 3,
		frontmatter,
	};
}

/** Locates a failure inside a frontmatter section: the key path under it. */
type SectionFail = (code: CompositionErrorCode, msg: string, at?: readonly string[]) => never;

/** D34.6 — `density` has no author-facing attribute, so its scale is stated here. */
const DENSITY_VALUES = ['full', 'compact', 'minimal'];

/**
 * D34 — `defaults`: universal axes only, each with a value the axis accepts.
 * A rune's own attribute takes its default where it is declared.
 */
function parseDefaults(raw: unknown, fail: SectionFail): Record<string, string> | undefined {
	if (raw === undefined) return undefined;
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		fail('defaults-invalid', '`defaults` must be a mapping of universal attributes to values.');
	}
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (value === null || typeof value === 'object') {
			fail('defaults-invalid', `\`defaults.${key}\` must be a single value.`, [key]);
		}
		const text = String(value);
		const accepted =
			key === 'density'
				? DENSITY_VALUES
				: universalAttributeDefinition(key) === undefined
					? undefined
					: (universalAttributeDefinition(key)!.matches as string[] | undefined);
		if (key !== 'density' && universalAttributeDefinition(key) === undefined) {
			fail(
				'defaults-invalid',
				`\`defaults\` takes universal attributes only, and \`${key}\` is not one. A rune's own attribute takes its default where it is declared, under \`attributes\` (D34).`,
				[key],
			);
		}
		if (Array.isArray(accepted) && !accepted.includes(text)) {
			fail(
				'defaults-invalid',
				`\`defaults.${key}\` is \`${text}\`, which \`${key}\` does not accept (${accepted.join(', ')}).`,
				[key],
			);
		}
		out[key] = text;
	}
	return out;
}

function parseAttributes(raw: unknown, sectionFail: SectionFail): Record<string, SchemaAttribute> {
	const fail = (code: CompositionErrorCode, msg: string) => sectionFail(code, msg);
	if (raw === undefined) return {};
	if (!raw || typeof raw !== 'object' || Array.isArray(raw))
		fail('attribute-invalid', '`attributes` must be a mapping.');
	const out: Record<string, SchemaAttribute> = {};
	for (const [name, decl] of Object.entries(raw as Record<string, unknown>)) {
		const where = `attribute \`${name}\``;
		const at = (code: CompositionErrorCode, msg: string) => sectionFail(code, msg, [name]);
		if (!/^[a-z][a-zA-Z0-9]*(-[a-z0-9]+)*$/.test(name))
			at('attribute-invalid', `${where}: not a valid attribute name.`);
		if (!decl || typeof decl !== 'object' || Array.isArray(decl)) {
			at('attribute-invalid', `${where} must be a mapping such as \`{ type: string }\`.`);
		}
		const d = decl as Record<string, unknown>;
		for (const key of Object.keys(d)) {
			if (!ATTRIBUTE_KEYS.has(key)) {
				at(
					'attribute-invalid',
					`${where}: unknown key \`${key}\` (expected ${[...ATTRIBUTE_KEYS].join(', ')}).`,
				);
			}
		}
		const type = ATTRIBUTE_TYPES[String(d.type ?? 'string')];
		if (!type) at('attribute-invalid', `${where}: \`type\` must be string, number or boolean.`);
		if (d.matches !== undefined) {
			if (!Array.isArray(d.matches) || d.matches.length === 0) {
				at('attribute-invalid', `${where}: \`matches\` must be a non-empty list.`);
			}
			if (RESERVED_MODIFIERS.has(kebab(name))) {
				at(
					'attribute-reserved',
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
function parseFields(raw: unknown, where: string, fail: SectionFail): ContentFieldDefinition[] {
	const section = where.split('.').pop()!;
	if (raw === undefined) return [];
	const entries: Array<[string, unknown]> = Array.isArray(raw)
		? raw.map((f) => [String((f as Record<string, unknown>)?.name ?? ''), f])
		: raw && typeof raw === 'object'
			? Object.entries(raw)
			: fail('content-model-invalid', `\`${where}\` must be a mapping of fields.`);
	return entries.map(([name, f]) => {
		const at = (code: CompositionErrorCode, msg: string) => fail(code, msg, [section, name]);
		if (!/^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$/.test(name)) {
			at('content-model-invalid', `\`${where}\`: \`${name}\` is not a valid field name.`);
		}
		if (!f || typeof f !== 'object')
			at('content-model-invalid', `\`${where}.${name}\` must be a mapping.`);
		const def = { ...(f as Record<string, unknown>) };
		delete def.name;
		for (const key of Object.keys(def)) {
			if (!FIELD_KEYS.has(key)) {
				at(
					'content-model-invalid',
					`\`${where}.${name}\`: unknown key \`${key}\` (expected ${[...FIELD_KEYS].join(', ')}).`,
				);
			}
		}
		if (typeof def.match !== 'string')
			at('content-model-invalid', `\`${where}.${name}\` needs a \`match\`.`);
		if (def.itemModel !== undefined) {
			def.itemModel = parseItemModel(def.itemModel, `${where}.${name}.itemModel`, (code, msg) =>
				fail(code, msg, [section, name, 'itemModel']),
			);
		}
		return { name, ...def } as unknown as ContentFieldDefinition;
	});
}

const ITEM_FIELD_KEYS = new Set([
	'name',
	'match',
	'optional',
	'greedy',
	'extract',
	'pattern',
	'itemModel',
]);

/**
 * An `itemModel` as YAML writes it. YAML has no regular expressions, so every
 * `pattern` other than `remainder` arrives as a string and is compiled here, at
 * every nesting level — the resolver applies a pattern only when it is a
 * `RegExp`, so a string one would match nothing, silently (BUG-038).
 */
function parseItemModel(
	raw: unknown,
	where: string,
	fail: (code: CompositionErrorCode, msg: string) => never,
): ItemModel {
	const fields = (raw as { fields?: unknown } | null)?.fields;
	if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(fields)) {
		fail('content-model-invalid', `\`${where}\` must be a mapping with a \`fields\` list.`);
	}
	return {
		fields: (fields as unknown[]).map((f) => {
			const entry = f as Record<string, unknown> | null;
			if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') {
				fail('content-model-invalid', `a \`${where}\` field needs a \`name\`.`);
			}
			const field = entry as Record<string, unknown>;
			const label = `\`${where}\` field \`${field.name}\``;
			for (const key of Object.keys(field)) {
				if (!ITEM_FIELD_KEYS.has(key)) {
					fail(
						'content-model-invalid',
						`${label}: unknown key \`${key}\` (expected ${[...ITEM_FIELD_KEYS].join(', ')}).`,
					);
				}
			}
			if (typeof field.match !== 'string') {
				fail('content-model-invalid', `${label} needs a \`match\`.`);
			}
			const out = { ...field } as unknown as ItemFieldDefinition;
			if (field.pattern !== undefined) {
				if (typeof field.pattern !== 'string') {
					fail('content-model-invalid', `${label}: \`pattern\` must be a string.`);
				}
				if (field.pattern !== 'remainder') {
					try {
						out.pattern = new RegExp(field.pattern as string);
					} catch (e) {
						fail(
							'content-model-invalid',
							`${label}: \`pattern\` is not a regular expression: ${(e as Error).message}`,
						);
					}
				}
			}
			if (field.itemModel !== undefined) {
				out.itemModel = parseItemModel(field.itemModel, `${where}.${field.name}.itemModel`, fail);
			}
			return out;
		}),
	};
}

function parseHeadingExtract(raw: unknown, sectionFail: SectionFail): HeadingExtract {
	const fail = (code: CompositionErrorCode, msg: string) =>
		sectionFail(code, msg, ['headingExtract']);
	const fields = (raw as { fields?: unknown })?.fields;
	if (!Array.isArray(fields))
		fail('content-model-invalid', '`content.headingExtract.fields` must be a list.');
	return {
		fields: (fields as Array<Record<string, unknown>>).map((f) => {
			if (typeof f?.name !== 'string' || typeof f.pattern !== 'string') {
				fail('content-model-invalid', 'a `headingExtract` field needs a `name` and a `pattern`.');
			}
			let pattern: RegExp | 'remainder' = 'remainder';
			if (f.pattern !== 'remainder') {
				try {
					pattern = new RegExp(f.pattern as string);
				} catch (e) {
					fail(
						'content-model-invalid',
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
	'implicitSection',
]);
/** `dynamicZones` and `zoneModel` are accepted as keys so that their rejection
 *  can say why, rather than reporting an unknown key. */
const DELIMITED_KEYS = new Set(['type', 'delimiter', 'zones', 'dynamicZones', 'zoneModel']);
const ZONE_KEYS = new Set(['name', 'primary', 'fields']);

function parseContentModel(raw: unknown, fail: SectionFail): ContentModel {
	if (raw === undefined) return { type: 'sequence', fields: [] };
	if (!raw || typeof raw !== 'object' || Array.isArray(raw))
		fail('content-model-invalid', '`content` must be a mapping.');
	const c = raw as Record<string, unknown>;
	const allowed =
		c.type === 'sequence'
			? SEQUENCE_KEYS
			: c.type === 'sections'
				? SECTIONS_KEYS
				: c.type === 'delimited'
					? DELIMITED_KEYS
					: null;
	if (!allowed) {
		fail(
			'content-model-type',
			`\`content.type\` must be \`sequence\`, \`sections\` or \`delimited\`${c.type ? `, not \`${String(c.type)}\`` : ''}: a composition's slots are the model's fields.`,
		);
	}
	for (const key of Object.keys(c)) {
		if (!allowed!.has(key)) {
			fail(
				'content-model-invalid',
				`\`content\`: unknown key \`${key}\` for a ${String(c.type)} model.`,
				[key],
			);
		}
	}
	if (c.type === 'sequence') {
		return {
			type: 'sequence',
			fields: parseFields(c.fields, 'content.fields', fail),
		} as SequenceModel;
	}
	if (c.type === 'delimited') return parseDelimitedModel(c, fail);
	if (c.fields !== undefined && c.preamble !== undefined) {
		fail(
			'content-model-invalid',
			'`content` declares both `fields` and `preamble`; they are one thing — use `preamble`.',
		);
	}
	const sectionModel =
		c.sectionModel === undefined
			? ({
					type: 'sequence',
					fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
				} as SequenceModel)
			: parseContentModel(c.sectionModel, (code, msg, at) =>
					fail(code, msg, ['sectionModel', ...(at ?? [])]),
				);
	if (c.emitAttributes !== undefined) {
		const ea = c.emitAttributes;
		if (
			!ea ||
			typeof ea !== 'object' ||
			Array.isArray(ea) ||
			!Object.values(ea).every((v) => typeof v === 'string')
		) {
			fail(
				'content-model-invalid',
				'`content.emitAttributes` must map names to `$heading`, `$<field>` or a literal.',
				['emitAttributes'],
			);
		}
	}
	let implicit: SectionsModel['implicitSection'];
	if (c.implicitSection !== undefined) {
		const is = c.implicitSection as { attributes?: unknown } | null;
		const attrs = is?.attributes ?? {};
		if (
			!is ||
			typeof is !== 'object' ||
			Array.isArray(is) ||
			Object.keys(is).some((k) => k !== 'attributes') ||
			!attrs ||
			typeof attrs !== 'object' ||
			Array.isArray(attrs) ||
			!Object.values(attrs).every((v) => typeof v === 'string')
		) {
			fail(
				'content-model-invalid',
				'`content.implicitSection` must be `{ attributes: { <name>: <literal>, … } }`.',
				['implicitSection'],
			);
		}
		implicit = { attributes: attrs as Record<string, string> };
	}
	const model = {
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
		...(implicit ? { implicitSection: implicit } : {}),
	} as SectionsModel;
	checkImplicitSection(model, fail);
	return model;
}

/** A `delimited` model (SPEC-169 D1): `hr`, fixed zones, one zone per name. */
function parseDelimitedModel(c: Record<string, unknown>, fail: SectionFail): DelimitedModel {
	if (c.zoneModel !== undefined && !c.dynamicZones) {
		fail(
			'dynamic-zones',
			'`content.zoneModel` describes dynamic zones, which a composition does not support: their zones have no fixed names, so a template has nothing to place. Declare fixed `zones` (SPEC-169 D1).',
			['zoneModel'],
		);
	}
	const delimiter = c.delimiter ?? 'hr';
	if (!Array.isArray(c.zones) && !c.dynamicZones) {
		fail('content-model-invalid', '`content.zones` must be a list of zones.', ['zones']);
	}
	const zones = ((c.zones as unknown[] | undefined) ?? []).map((z): DelimitedZone => {
		const zone = z as Record<string, unknown> | null;
		if (!zone || typeof zone !== 'object' || typeof zone.name !== 'string' || zone.name === '') {
			fail('content-model-invalid', 'each of `content.zones` needs a `name`.', ['zones']);
		}
		const name = (zone as Record<string, unknown>).name as string;
		for (const key of Object.keys(zone as object)) {
			if (!ZONE_KEYS.has(key)) {
				fail(
					'content-model-invalid',
					`zone \`${name}\`: unknown key \`${key}\` (expected ${[...ZONE_KEYS].join(', ')}).`,
					['zones', name],
				);
			}
		}
		return {
			name,
			type: 'sequence',
			fields: parseFields(zone!.fields, `content.zones.${name}.fields`, (code, msg, at) =>
				fail(code, msg, ['zones', name, ...(at ?? [])]),
			),
			...(zone!.primary === true ? { primary: true } : {}),
		};
	});
	const primaries = zones.filter((z) => z.primary);
	if (primaries.length > 1) {
		fail(
			'content-model-invalid',
			`zones ${primaries.map((z) => `\`${z.name}\``).join(', ')} are all \`primary\`; at most one zone receives content written with no \`---\`.`,
			['zones'],
		);
	}
	const model = {
		type: 'delimited',
		delimiter: delimiter as string,
		zones,
		...(c.dynamicZones ? { dynamicZones: true } : {}),
	} as DelimitedModel;
	checkDelimitedModel(model, fail);
	return model;
}

/**
 * The generated, block-less engine config of a composed rune (D2a). Not
 * hand-written beside the definition: modifiers come from its enum attributes
 * and from every attribute a `metaFields` entry reads, and `metaFields` /
 * `blocks` are carried as declared.
 *
 * The second source is what lets a placed meta block render (D7): the engine
 * resolves a field against the rune's modifier values, exactly as it does for a
 * tree-owning rune — which must declare the same attributes as modifiers for
 * its own blocks to fill.
 */
export function composedRuneConfig(def: CompositionDefinition): RuneConfig {
	const read = new Set<string>();
	for (const [name, field] of Object.entries(def.metaFields ?? {})) {
		read.add(name);
		const f = (field ?? {}) as {
			condition?: unknown;
			href?: unknown;
			rating?: { total?: unknown };
		};
		for (const ref of [f.condition, f.href, f.rating?.total]) {
			if (typeof ref === 'string') read.add(ref);
		}
	}
	const modifiers: Record<string, { source: 'meta'; default?: string }> = {};
	for (const [name, attr] of Object.entries(def.attributes)) {
		if (!attr.matches && !read.has(name)) continue;
		modifiers[name] = {
			source: 'meta',
			...(attr.default !== undefined ? { default: String(attr.default) } : {}),
		};
	}
	// D34 — a root-placed axis's default is the generated config's, since a
	// template never writes on the root.
	const d = def.defaults ?? {};
	return {
		composed: true,
		...(d.width ? { defaultWidth: d.width as RuneConfig['defaultWidth'] } : {}),
		...(d.spacing ? { defaultSpacing: d.spacing } : {}),
		...(d.inset ? { defaultInset: d.inset } : {}),
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
					throw new CompositionError(
						'parent-required',
						`Rune "${name}": its template places \`{% ${placedName} %}\`, which requires \`{% ${requiredRune} %}\` as its parent, ${parent ? `but sits inside \`{% ${parent} %}\`` : `but the template's nearest rune around it is "${name}" itself`}. Place \`{% ${requiredRune} %}\` and let its content model produce the \`${placed.name}\` children (D12).`,
					);
				}
			}

			if (info.schemaType && placed.entry.schema) {
				const peer = emittedTypes(placed.entry, tableOf(placed.entry.schema)).find(
					(t) => !SUBORDINATE_SCHEMA_TYPES.has(t),
				);
				if (peer) {
					throw new CompositionError(
						'peer-schema-type',
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
			throw new CompositionError(
				'composition-cycle',
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
