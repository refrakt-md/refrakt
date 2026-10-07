/**
 * The slot declaration — SPEC-143.
 *
 * A rune whose every output slot comes from exactly one resolved field, wrapped
 * but not restructured (D4), states that as data on `createContentModelSchema`
 * instead of writing a `transform`:
 *
 * ```ts
 * emits: {
 *   rune: 'work',
 *   tag: 'article',
 *   properties: { id: '', status: 'draft' },
 *   slots: {
 *     title: { as: 'region', el: 'header' },
 *     blurb: { from: 'description', as: 'region', omitWhenEmpty: true },
 *     body:  { from: 'sections', as: 'region' },
 *   },
 * },
 * ```
 *
 * `makeSlotTransform` turns that into an ordinary transform function — a closure
 * over the declaration, built once when the schema is constructed — and the
 * schema calls it at the same single call site a hand-written transform uses.
 * Nothing downstream can tell the two apart, which is what makes the
 * byte-identical migration gate (D7) a property of the construction rather than
 * a hope.
 *
 * What the declaration may say, and nothing more (D2): a slot's name, the field
 * (or attribute) it comes from, whether it is a single `value` or a `region` of
 * nodes with a boundary element, and whether it is omitted when empty. It
 * cannot nest one slot in another, order slots, or create containers — those
 * belong to the engine's `layout`. Every value is data (D9), so the declaration
 * round-trips through JSON unchanged.
 */
import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
import type { ContentModel, ResolvedContent, StructuralContentModel } from '@refrakt-md/types';
import { createComponentRenderable } from './component.js';
import { fieldMetas } from './field-metas.js';
import type { FieldMetaSpec } from './field-metas.js';
import { selectStructuralModel } from './resolver.js';

const { Tag } = Markdoc;

/** A slot is one node, or a region of nodes inside a boundary element. */
export type SlotKind = 'value' | 'region';

/** The closed vocabulary of section roles — mirrors `SectionRole`. */
const SECTION_ROLES = [
	'header',
	'preamble',
	'title',
	'description',
	'body',
	'footer',
	'media',
] as const;
export type SlotRole = (typeof SECTION_ROLES)[number];

export interface SlotDeclaration {
	/**
	 * The resolved content field the slot comes from, or `attrs.<name>` for a
	 * value read from an attribute. Defaults to the slot's own name, so a slot
	 * named after its field needs nothing beyond its kind.
	 */
	from?: string;
	/**
	 * `value` — the field is already one node, and that node carries the name.
	 * An attribute value is rendered as text inside `el` (default `span`).
	 * `region` — the field's nodes are wrapped in one boundary element `el`
	 * (default `div`), which carries the name; the nodes inside carry none.
	 */
	as: SlotKind;
	/** The element: a region's boundary, or an attribute value's node. */
	el?: string;
	/** Emit nothing when the field resolves to nothing. */
	omitWhenEmpty?: boolean;
	/**
	 * The slot's section role (`sections` in the rune's config). Defaults to the
	 * slot name when that is a role, else to the source field's name when that
	 * is one — so `title`, `body` and `description → blurb` need nothing here.
	 */
	role?: SlotRole;
}

/** A slot entry: its kind alone, or the full declaration. */
export type SlotEntry = SlotKind | SlotDeclaration;

export interface EmitsDeclaration {
	/** The rune's kebab-case name — the renderable's `data-rune`. */
	rune: string;
	/** The root element. */
	tag: string;
	/** Structural property name, set as `data-field` on the root. */
	property?: string;
	/** Attributes and file variables rendered as property metas — `fieldMetas`' data form. */
	properties?: FieldMetaSpec;
	/** The named content slots, emitted in declaration order. */
	slots: Record<string, SlotEntry>;
}

interface NormalizedSlot {
	name: string;
	kind: SlotKind;
	/** Attribute name, when the slot reads an attribute. */
	attr?: string;
	/** Content field name, when the slot reads a field. */
	field?: string;
	el?: string;
	omitWhenEmpty: boolean;
	role?: SlotRole;
}

const EMITS_KEYS = new Set(['rune', 'tag', 'property', 'properties', 'slots']);
const SLOT_KEYS = new Set(['from', 'as', 'el', 'omitWhenEmpty', 'role']);
/** Keys that would make a slot structural. Named so the refusal can say why (D2). */
const STRUCTURE_KEYS = new Set([
	'slots',
	'children',
	'nest',
	'nested',
	'into',
	'parent',
	'wrap',
	'wrapper',
	'container',
	'group',
	'order',
	'position',
	'before',
	'after',
	'layout',
]);
const ELEMENT = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SLOT_NAME = /^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$/;
const RUNE_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Reject anything that would not survive `JSON.parse(JSON.stringify(…))`
 * unchanged — a function above all (D9), but also `undefined`, a non-finite
 * number, or a class instance such as a `RegExp`.
 */
function assertPlainData(value: unknown, path: string, fail: (msg: string) => never): void {
	if (typeof value === 'function') {
		fail(`${path} is a function. The declaration is data only (SPEC-143 D9).`);
	}
	if (value === undefined) {
		fail(`${path} is undefined, which does not survive a JSON round-trip — omit the key.`);
	}
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) fail(`${path} is not a finite number.`);
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => assertPlainData(v, `${path}[${i}]`, fail));
		return;
	}
	if (typeof value === 'object') {
		const proto = Object.getPrototypeOf(value);
		if (proto !== Object.prototype && proto !== null) {
			fail(`${path} is a ${proto?.constructor?.name ?? 'class'} instance, not plain data.`);
		}
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			assertPlainData(v, `${path}.${k}`, fail);
		}
		return;
	}
	fail(`${path} has unsupported type ${typeof value}.`);
}

interface FieldInfo {
	greedy: boolean;
	/** The `sections` field of a sections model. */
	sections: boolean;
}

/**
 * Every field the content model can resolve, across conditional branches. A
 * model given as a function of attributes is sampled with no attributes —
 * enough for a model that only varies its details, which is every model this
 * declaration supports.
 */
function collectFields(model: ContentModel | ((attrs: Record<string, any>) => ContentModel)) {
	const fields = new Map<string, FieldInfo>();
	const unsupported = new Set<string>();
	const visit = (m: ContentModel): void => {
		if ('when' in m) {
			m.when.forEach((b) => visit(b.model));
			visit(m.default);
			return;
		}
		const s = m as StructuralContentModel;
		if (s.type === 'sequence' || s.type === 'sections') {
			for (const f of s.fields ?? []) {
				const prev = fields.get(f.name);
				fields.set(f.name, { greedy: !!f.greedy || !!prev?.greedy, sections: false });
			}
			if (s.type === 'sections') fields.set('sections', { greedy: true, sections: true });
		} else {
			unsupported.add(s.type);
		}
	};
	visit(typeof model === 'function' ? model({}) : model);
	return { fields, unsupported };
}

/**
 * Check a declaration against the rune's content model and normalise it.
 * Throws, naming the rune and the offending slot, rather than applying any part
 * of a declaration it cannot honour.
 */
export function validateEmits(
	emits: EmitsDeclaration,
	contentModel: ContentModel | ((attrs: Record<string, any>) => ContentModel),
): NormalizedSlot[] {
	const runeLabel =
		emits && typeof emits === 'object' && typeof emits.rune === 'string'
			? `"${emits.rune}"`
			: '(unnamed)';
	const fail = (msg: string): never => {
		throw new Error(`Rune ${runeLabel}: invalid \`emits\` declaration — ${msg}`);
	};

	if (!emits || typeof emits !== 'object' || Array.isArray(emits)) fail('must be an object.');
	assertPlainData(emits, 'emits', fail);

	for (const key of Object.keys(emits)) {
		if (!EMITS_KEYS.has(key)) {
			fail(
				STRUCTURE_KEYS.has(key)
					? `\`${key}\` would declare structure. The declaration names slots only; nesting, ordering and containers are \`layout\`'s (SPEC-143 D2).`
					: `unknown key \`${key}\` (expected ${[...EMITS_KEYS].join(', ')}).`,
			);
		}
	}
	if (typeof emits.rune !== 'string' || !RUNE_NAME.test(emits.rune)) {
		fail('`rune` must be the kebab-case rune name.');
	}
	if (typeof emits.tag !== 'string' || !ELEMENT.test(emits.tag)) {
		fail('`tag` must be an element name.');
	}
	if (emits.property !== undefined && typeof emits.property !== 'string') {
		fail('`property` must be a string.');
	}

	const propertyKeys = new Set<string>();
	if (emits.properties !== undefined) {
		if (typeof emits.properties !== 'object' || Array.isArray(emits.properties)) {
			fail('`properties` must be an object.');
		}
		for (const [key, entry] of Object.entries(emits.properties)) {
			propertyKeys.add(key);
			if (typeof entry === 'string') continue;
			const ok =
				entry &&
				typeof entry === 'object' &&
				Array.isArray(entry.from) &&
				entry.from.every((s) => typeof s === 'string' && /^(attrs|file)\.\S+$/.test(s)) &&
				typeof entry.default === 'string' &&
				Object.keys(entry).every((k) => k === 'from' || k === 'default');
			if (!ok) {
				fail(
					`property \`${key}\` must be a default string or { from: ["attrs.<name>" | "file.<name>", …], default: string }.`,
				);
			}
		}
	}

	if (!emits.slots || typeof emits.slots !== 'object' || Array.isArray(emits.slots)) {
		fail('`slots` must be an object of slot entries.');
	}
	const slotNames = Object.keys(emits.slots);
	if (slotNames.length === 0) fail('`slots` declares no slot.');

	const { fields, unsupported } = collectFields(contentModel);
	const normalized: NormalizedSlot[] = [];
	for (const name of slotNames) {
		const where = `slot \`${name}\``;
		if (!SLOT_NAME.test(name)) fail(`${where}: not a valid data-name.`);
		if (propertyKeys.has(name)) {
			fail(
				`${where} is also a property. Properties and slots share one flat namespace (ADR-008), and the two would carry one name on two nodes.`,
			);
		}
		const raw = emits.slots[name];
		const decl: SlotDeclaration = typeof raw === 'string' ? { as: raw } : raw;
		if (!decl || typeof decl !== 'object' || Array.isArray(decl)) {
			fail(`${where} must be "value", "region" or a slot declaration.`);
		}
		for (const key of Object.keys(decl)) {
			if (SLOT_KEYS.has(key)) continue;
			fail(
				STRUCTURE_KEYS.has(key)
					? `${where}: \`${key}\` would nest, order or contain slots. A slot is flat — that is \`layout\`'s job (SPEC-143 D2).`
					: `${where}: unknown key \`${key}\` (expected ${[...SLOT_KEYS].join(', ')}).`,
			);
		}
		if (decl.as !== 'value' && decl.as !== 'region') {
			fail(`${where}: \`as\` must be "value" or "region".`);
		}
		if (decl.el !== undefined && (typeof decl.el !== 'string' || !ELEMENT.test(decl.el))) {
			fail(
				`${where}: \`el\` must be a single element name — a slot has one boundary, never a nested one (SPEC-143 D2).`,
			);
		}
		if (decl.omitWhenEmpty !== undefined && typeof decl.omitWhenEmpty !== 'boolean') {
			fail(`${where}: \`omitWhenEmpty\` must be a boolean.`);
		}
		if (decl.role !== undefined && !(SECTION_ROLES as readonly string[]).includes(decl.role)) {
			fail(`${where}: \`role\` must be one of ${SECTION_ROLES.join(', ')}.`);
		}
		const from = decl.from ?? name;
		if (typeof from !== 'string' || from === '') fail(`${where}: \`from\` must be a string.`);

		const slot: NormalizedSlot = {
			name,
			kind: decl.as,
			el: decl.el,
			omitWhenEmpty: decl.omitWhenEmpty ?? false,
			role: decl.role,
		};
		if (from.startsWith('attrs.')) {
			slot.attr = from.slice('attrs.'.length);
			if (!slot.attr) fail(`${where}: \`from\` names no attribute.`);
			if (decl.as !== 'value') {
				fail(`${where}: an attribute is one value; it cannot be a region.`);
			}
		} else {
			if (from.includes('.')) {
				fail(`${where}: \`from\` is a content field name or "attrs.<name>", not "${from}".`);
			}
			const info = fields.get(from);
			if (!info) {
				const known = [...fields.keys()];
				fail(
					unsupported.size > 0 && known.length === 0
						? `${where}: the content model is ${[...unsupported].join(' / ')}, which the slot declaration does not read. Keep a \`transform\` (SPEC-143 D3).`
						: `${where}: \`from: "${from}"\` names no field of the content model (fields: ${known.join(', ') || 'none'}).`,
				);
			}
			slot.field = from;
			if (decl.as === 'value') {
				if (info!.greedy) {
					fail(
						`${where}: field \`${from}\` can resolve to several nodes, and a value slot names every node it emits — that is two nodes carrying data-name="${name}". Declare it \`as: "region"\`.`,
					);
				}
				if (decl.el !== undefined) {
					fail(
						`${where}: a value read from a field is already one node; there is nothing to wrap. Declare it \`as: "region"\` to give it a boundary.`,
					);
				}
			}
		}
		normalized.push(slot);
	}
	return normalized;
}

function isRole(name: string | undefined): name is SlotRole {
	return name !== undefined && (SECTION_ROLES as readonly string[]).includes(name);
}

/**
 * The `sections` join table a declaration implies — slot name → section role.
 * A slot's role is the one it states, else its own name when that is a role,
 * else its source field's name when that is one.
 */
export function slotSections(emits: EmitsDeclaration): Record<string, SlotRole> {
	const out: Record<string, SlotRole> = {};
	for (const [name, raw] of Object.entries(emits.slots)) {
		const decl: SlotDeclaration = typeof raw === 'string' ? { as: raw } : raw;
		const from = decl.from ?? name;
		const role = decl.role ?? (isRole(name) ? name : isRole(from) ? from : undefined);
		if (role) out[name] = role;
	}
	return out;
}

function asNodes(value: unknown): Node[] {
	if (Array.isArray(value)) return value as Node[];
	if (value != null) return [value as Node];
	return [];
}

function render(value: unknown, config: Config): RenderableTreeNode[] {
	return Markdoc.transform(asNodes(value), config) as RenderableTreeNode[];
}

/** Heading text → `data-name` slug, for a section with no canonical slug. */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * One resolved section entry (a `sections` model without `emitTag`) as a
 * `<section>` named by its slug: its heading, then its resolved fields.
 *
 * The slug is the entry's own identity — the known section's language-stable
 * `$canonicalSlug` (SPEC-035), else the heading text slugified — and a known
 * section's heading carries `data-known-section` so a table of contents can
 * pick the known sections out. A top-level thematic break in the body is the
 * author's separator between thoughts, not content, and is dropped.
 */
function renderSectionEntry(entry: Record<string, unknown>, config: Config): RenderableTreeNode {
	const heading = (entry.$heading as string | undefined) ?? '';
	const canonicalName = entry.$canonicalName as string | undefined;
	const slug = (entry.$canonicalSlug as string | undefined) ?? slugify(heading);

	const children: RenderableTreeNode[] = [];
	const headingNode = entry.$headingNode as Node | undefined;
	if (headingNode) {
		const renderedHeading = render([headingNode], config);
		const first = renderedHeading[0];
		if (canonicalName && Tag.isTag(first)) {
			first.attributes['data-known-section'] = canonicalName;
		}
		children.push(...renderedHeading);
	}
	for (const [key, value] of Object.entries(entry)) {
		if (key.startsWith('$')) continue;
		children.push(...render(value, config).filter((n) => !(Tag.isTag(n) && n.name === 'hr')));
	}
	return new Tag('section', { 'data-name': slug }, children);
}

/**
 * Build the transform a declaration describes. Called once, when the schema is
 * constructed; the closure it returns has the signature of a hand-written
 * transform and is called where one would be.
 */
export function makeSlotTransform(
	emits: EmitsDeclaration,
	contentModel: ContentModel | ((attrs: Record<string, any>) => ContentModel),
): (
	resolved: ResolvedContent,
	attrs: Record<string, any>,
	config: Config,
	node: Node,
) => RenderableTreeNodes {
	const slots = validateEmits(emits, contentModel);
	const { rune, tag, property, properties } = emits;

	return (resolved, attrs, config, node) => {
		// D5 — whether sections arrive as resolved entries or as emitted child
		// runes is the content model's `emitTag`; read it, per instance, from the
		// branch the resolver actually took.
		let structural: StructuralContentModel | undefined;
		const sectionsEmitTag = (): string | undefined => {
			structural ??= selectStructuralModel(
				node.children,
				typeof contentModel === 'function' ? contentModel(attrs) : contentModel,
				attrs,
			);
			return structural.type === 'sections' ? structural.emitTag : undefined;
		};

		const refs: Record<string, InstanceType<typeof Tag>> = {};
		const children: RenderableTreeNode[] = [];

		for (const slot of slots) {
			let out: InstanceType<typeof Tag> | undefined;

			if (slot.attr !== undefined) {
				const value = attrs[slot.attr];
				if (slot.omitWhenEmpty && (value == null || value === '')) continue;
				out = new Tag(slot.el ?? 'span', {}, [value ?? '']);
			} else {
				const field = slot.field!;
				let nodes: RenderableTreeNode[];
				if (field === 'sections' && sectionsEmitTag() === undefined) {
					nodes = asNodes(resolved.sections).map((entry) =>
						renderSectionEntry(entry as unknown as Record<string, unknown>, config),
					);
				} else {
					nodes = render(resolved[field], config);
				}

				if (slot.kind === 'value') {
					if (nodes.length === 0) continue;
					const only = nodes[0];
					if (nodes.length > 1 || !Tag.isTag(only)) {
						throw new Error(
							`Rune "${rune}": value slot \`${slot.name}\` rendered ${nodes.length} node(s), not one element. A value slot names exactly one node.`,
						);
					}
					out = only;
				} else {
					if (nodes.length === 0 && slot.omitWhenEmpty) continue;
					out = new Tag(slot.el ?? 'div', {}, nodes);
				}
			}

			refs[slot.name] = out;
			children.push(out);
		}

		return createComponentRenderable({
			rune,
			tag: tag as never,
			property,
			properties: properties ? fieldMetas(attrs, config, properties) : undefined,
			refs,
			children,
		});
	};
}

/** One slot as the review surfaces (`inspect`, `reference`) print it. */
export interface DescribedSlot {
	name: string;
	/** `attrs.<name>` or a content field. */
	from: string;
	as: SlotKind;
	/** The element the slot's node is — a region's boundary, or an attribute value's node. */
	el?: string;
	omitWhenEmpty: boolean;
	role?: SlotRole;
	/** For a `sections` field: how sections arrive (D5), read from the content model. */
	sections?: 'entries' | 'child runes';
}

/**
 * A declaration with every default made explicit — what the generated transform
 * will actually do, which is the thing a reviewer needs and the declaration's
 * terseness hides.
 */
export function describeSlots(
	emits: EmitsDeclaration,
	contentModel?: ContentModel | ((attrs: Record<string, any>) => ContentModel),
): DescribedSlot[] {
	const roles = slotSections(emits);
	let emitTag: string | undefined;
	if (contentModel) {
		const m = typeof contentModel === 'function' ? contentModel({}) : contentModel;
		const s = 'when' in m ? m.default : m;
		if ('type' in s && s.type === 'sections') emitTag = s.emitTag;
	}
	return Object.entries(emits.slots).map(([name, raw]) => {
		const decl: SlotDeclaration = typeof raw === 'string' ? { as: raw } : raw;
		const from = decl.from ?? name;
		const fromAttr = from.startsWith('attrs.');
		const el =
			decl.as === 'region' ? (decl.el ?? 'div') : fromAttr ? (decl.el ?? 'span') : undefined;
		return {
			name,
			from,
			as: decl.as,
			...(el ? { el } : {}),
			omitWhenEmpty: decl.omitWhenEmpty ?? false,
			...(roles[name] ? { role: roles[name] } : {}),
			...(from === 'sections' && contentModel
				? { sections: emitTag ? ('child runes' as const) : ('entries' as const) }
				: {}),
		};
	});
}

/** One line per slot, for the text surfaces. */
export function formatSlotLine(slot: DescribedSlot): string {
	const parts: string[] = [slot.as];
	if (slot.el) parts.push(`<${slot.el}>`);
	if (slot.omitWhenEmpty) parts.push('omitted when empty');
	if (slot.role) parts.push(`role: ${slot.role}`);
	if (slot.sections) parts.push(`sections arrive as ${slot.sections}`);
	return `${slot.name} <- ${slot.from}  (${parts.join(', ')})`;
}
