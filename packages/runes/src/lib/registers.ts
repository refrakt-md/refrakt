import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { readField } from '@refrakt-md/transform';

/**
 * Declarative entity and edge registration — SPEC-144 / WORK-611.
 *
 * A rune says *what it registers* — which named source holds the id, which
 * sources to carry into the data bag, which two hold an edge's endpoints — and
 * one core participant (`createRegistersHooks`) does the registering in the
 * existing Phase 2 / Phase 3 slots. Plugins keep `PluginPipelineHooks` for
 * everything else; this is a generic participant beside them.
 *
 * The vocabulary is closed (ADR-036, SPEC-144 D1): every value is a string, a
 * boolean, or a list or record of those. No expression form, no predicate, no
 * function. A domain that needs more writes a plugin hook — the plan plugin is
 * the standing example (D5).
 *
 * **Where a value comes from** (D3, decided in WORK-611). A source is a bare
 * name, resolved the way the hand-written helpers always did: a `refs` entry —
 * a node carrying `data-name=<source>` inside the rune, read as its text — and
 * otherwise the rune's `data-rune-fields` bag. `createComponentRenderable`
 * rejects a rune whose properties and refs share a name (ADR-008), so the two
 * namespaces are disjoint and a bare name cannot mean two things. A name that
 * resolves to neither is a typo, and `validate` reports it with file and line
 * (`registers-source-unresolved`), the same audit a schema-table source gets.
 */

/** One data-bag entry: `'role'` carries source `role` as key `role`;
 *  `{ name: 'title' }` carries source `title` as key `name`. */
export type RegistersDataEntry = string | Readonly<Record<string, string>>;

/** The data bag: an ordered field list, or one source holding a JSON object
 *  that *is* the bag. Key order follows the declaration. */
export type RegistersData = readonly RegistersDataEntry[] | { readonly json: string };

export interface RegistersEntity {
	/** Registry type. Defaults to the rune name. */
	type?: string;
	/** The source holding the entity's id. A rune instance whose id is empty
	 *  registers nothing and warns. */
	idFrom: string;
	/** `'site'` (default) or `'page'` — see `EntityRegistration.scope`. */
	scope?: 'site' | 'page';
	/** What to carry in the entity's data bag. Nothing is added implicitly. */
	data?: RegistersData;
	/** Alternative names, split from a data-bag key. The name index the
	 *  participant builds in Phase 3 adds each alias after the ids, and an alias
	 *  already present keeps its first owner. */
	aliases?: { readonly from: string; readonly separator?: string };
}

export interface RegistersEdge {
	/** Registry type of the edge's own entry. Defaults to the rune name. */
	type?: string;
	/** Source holding the source entity's id (or alias). */
	from: string;
	/** Source holding the target entity's id (or alias). */
	to: string;
	/** The relationship-graph edge kind: a literal, or `{ field }` naming a key
	 *  of the edge's data bag. An empty field value falls back to the type. */
	kind: string | { readonly field: string };
	/** Contribute the reverse edge too: a literal, or `{ field }` naming a data
	 *  key whose value is `'true'`. Default `false`. */
	bidirectional?: boolean | { readonly field: string };
	/** Further sources for the edge entry's data bag. */
	data?: readonly RegistersDataEntry[];
}

/** A rune's `registers` block: exactly one of `entity` or `edge`. */
export interface RegistersDeclaration {
	entity?: RegistersEntity;
	edge?: RegistersEdge;
}

/** The name index a declaring plugin's aggregate slot receives in Phase 3. */
export interface RegistersIndex {
	/** Every declared entity by id and by alias. Ids are set in type
	 *  declaration order, then registry order, so a later id replaces an earlier
	 *  one; an alias never replaces anything already present. */
	entityByName: Map<string, import('@refrakt-md/types').EntityRegistration>;
}

/** Declarations recorded by `createContentModelSchema`, keyed by schema — the
 *  same pattern as `schemaTables`, for the same reason: tooling has only the
 *  schema to read from. */
export const schemaRegisters = new WeakMap<Schema, RegistersDeclaration>();

/** The `registers` block a rune declares, if it declares one. */
export function registersFor(schema: unknown): RegistersDeclaration | undefined {
	return schema && typeof schema === 'object' ? schemaRegisters.get(schema as Schema) : undefined;
}

// ---------------------------------------------------------------------------
// The closed vocabulary, checked at construction
// ---------------------------------------------------------------------------

const ENTITY_KEYS = new Set(['type', 'idFrom', 'scope', 'data', 'aliases']);
const EDGE_KEYS = new Set(['type', 'from', 'to', 'kind', 'bidirectional', 'data']);

/**
 * Check a declaration against the closed vocabulary, throwing on the first
 * violation. Runs at schema construction, so a malformed block fails the
 * import that defines it rather than a build that happens to use it.
 */
export function validateRegistersDeclaration(decl: unknown, where = 'registers'): void {
	assertInert(decl, where);
	const fail = (msg: string): never => {
		throw new Error(`${where}: ${msg}`);
	};
	if (!isRecord(decl)) fail('must be an object');
	const d = decl as Record<string, unknown>;
	const keys = Object.keys(d);
	if (keys.some((k) => k !== 'entity' && k !== 'edge')) {
		fail(
			`unknown key "${keys.find((k) => k !== 'entity' && k !== 'edge')}"; use "entity" or "edge"`,
		);
	}
	if ((d.entity === undefined) === (d.edge === undefined)) {
		fail('declare exactly one of "entity" or "edge"');
	}

	if (d.entity !== undefined) {
		const e = d.entity as Record<string, unknown>;
		if (!isRecord(e)) fail('entity must be an object');
		checkKeys(e, ENTITY_KEYS, `${where}.entity`);
		optionalName(e.type, `${where}.entity.type`);
		requireName(e.idFrom, `${where}.entity.idFrom`);
		if (e.scope !== undefined && e.scope !== 'site' && e.scope !== 'page') {
			fail(`entity.scope must be "site" or "page"`);
		}
		const dataKeys = checkData(e.data, `${where}.entity.data`, true);
		if (e.aliases !== undefined) {
			const a = e.aliases as Record<string, unknown>;
			if (!isRecord(a)) fail('entity.aliases must be an object');
			checkKeys(a, new Set(['from', 'separator']), `${where}.entity.aliases`);
			requireName(a.from, `${where}.entity.aliases.from`);
			if (a.separator !== undefined && (typeof a.separator !== 'string' || a.separator === '')) {
				fail('entity.aliases.separator must be a non-empty string');
			}
			// Aliases are expanded in Phase 3 from the registered entry, so the
			// value has to be in the bag.
			if (dataKeys !== 'json' && !dataKeys.includes(a.from as string)) {
				fail(`entity.aliases.from "${a.from}" must name a key of entity.data`);
			}
		}
	}

	if (d.edge !== undefined) {
		const e = d.edge as Record<string, unknown>;
		if (!isRecord(e)) fail('edge must be an object');
		checkKeys(e, EDGE_KEYS, `${where}.edge`);
		optionalName(e.type, `${where}.edge.type`);
		requireName(e.from, `${where}.edge.from`);
		requireName(e.to, `${where}.edge.to`);
		const dataKeys = checkData(e.data, `${where}.edge.data`, false) as string[];
		const bagKeys = ['from', 'to', ...dataKeys, 'name'];
		for (const field of ['kind', 'bidirectional'] as const) {
			const v = e[field];
			if (v === undefined && field === 'bidirectional') continue;
			if (field === 'kind' && typeof v === 'string') {
				if (v === '') fail('edge.kind must not be empty');
				continue;
			}
			if (field === 'bidirectional' && typeof v === 'boolean') continue;
			if (!isRecord(v)) fail(`edge.${field} must be a literal or { field }`);
			checkKeys(v as Record<string, unknown>, new Set(['field']), `${where}.edge.${field}`);
			const name = (v as Record<string, unknown>).field;
			requireName(name, `${where}.edge.${field}.field`);
			if (!bagKeys.includes(name as string)) {
				fail(`edge.${field}.field "${name}" must name a key of the edge's data bag`);
			}
		}
	}
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v);
}

function checkKeys(rec: Record<string, unknown>, allowed: Set<string>, where: string): void {
	for (const k of Object.keys(rec)) {
		if (!allowed.has(k)) {
			throw new Error(`${where}: unknown key "${k}" (allowed: ${[...allowed].join(', ')})`);
		}
	}
}

function requireName(v: unknown, where: string): void {
	if (typeof v !== 'string' || v === '') throw new Error(`${where} must be a non-empty string`);
}

function optionalName(v: unknown, where: string): void {
	if (v !== undefined) requireName(v, where);
}

/** Validate a `data` declaration and return the bag keys it produces, or
 *  `'json'` for the JSON form (whose keys are not known until build time). */
function checkData(data: unknown, where: string, allowJson: boolean): string[] | 'json' {
	if (data === undefined) return [];
	if (isRecord(data)) {
		if (!allowJson) throw new Error(`${where} must be a list`);
		checkKeys(data, new Set(['json']), where);
		requireName(data.json, `${where}.json`);
		return 'json';
	}
	if (!Array.isArray(data)) throw new Error(`${where} must be a list or { json }`);
	const keys: string[] = [];
	for (const entry of dataEntries(data as RegistersDataEntry[], where)) {
		if (keys.includes(entry.key)) throw new Error(`${where}: key "${entry.key}" appears twice`);
		keys.push(entry.key);
	}
	return keys;
}

function dataEntries(
	data: readonly RegistersDataEntry[],
	where = 'data',
): Array<{ key: string; source: string }> {
	return data.map((entry) => {
		if (typeof entry === 'string') {
			requireName(entry, where);
			return { key: entry, source: entry };
		}
		const pairs = isRecord(entry) ? Object.entries(entry) : [];
		if (pairs.length !== 1) {
			throw new Error(`${where}: an entry is a source name or a single { key: source } pair`);
		}
		const [key, source] = pairs[0];
		requireName(key, where);
		requireName(source, `${where}.${key}`);
		return { key, source: source as string };
	});
}

/** No functions, no class instances, nothing `JSON` would drop or reshape:
 *  the declaration must round-trip through `JSON.parse(JSON.stringify(…))`. */
function assertInert(v: unknown, where: string): void {
	if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
	if (Array.isArray(v)) {
		for (const [i, x] of v.entries()) assertInert(x, `${where}[${i}]`);
		return;
	}
	if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
		for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
			if (x === undefined) throw new Error(`${where}.${k}: undefined is not a value; omit the key`);
			assertInert(x, `${where}.${k}`);
		}
		return;
	}
	throw new Error(
		`${where}: a registers declaration holds only strings, booleans, lists and plain objects ` +
			`(found ${typeof v === 'function' ? 'a function' : typeof v}) — ADR-036`,
	);
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** Every source a declaration reads from the rune's output, with the role it
 *  plays — what the validate-time audit and `inspect` check. */
export function registersSources(
	decl: RegistersDeclaration,
): Array<{ source: string; role: string }> {
	const out: Array<{ source: string; role: string }> = [];
	if (decl.entity) {
		out.push({ source: decl.entity.idFrom, role: 'idFrom' });
		const data = decl.entity.data;
		if (data && !Array.isArray(data)) {
			out.push({ source: (data as { json: string }).json, role: 'data (json)' });
		} else if (data) {
			for (const { key, source } of dataEntries(data as RegistersDataEntry[])) {
				out.push({ source, role: `data.${key}` });
			}
		}
	}
	if (decl.edge) {
		out.push({ source: decl.edge.from, role: 'from' });
		out.push({ source: decl.edge.to, role: 'to' });
		for (const { key, source } of dataEntries(decl.edge.data ?? [])) {
			out.push({ source, role: `data.${key}` });
		}
	}
	return out;
}

type AnyTag = {
	name?: string;
	attributes?: Record<string, unknown>;
	children?: unknown[];
};

function isTag(n: unknown): n is AnyTag {
	return (
		!!n &&
		typeof n === 'object' &&
		(Markdoc.Tag.isTag(n) || (n as { $$mdtype?: string }).$$mdtype === 'Tag')
	);
}

/** The first node inside this rune carrying `data-name=<name>`. Bounded at
 *  nested runes: a name is unique per rune, and a `character-section` inside a
 *  `character` names its own heading `name` too (see `findAllByName`). */
function findRef(root: AnyTag, name: string): AnyTag | undefined {
	for (const c of root.children ?? []) {
		if (!isTag(c)) continue;
		if (c.attributes?.['data-rune'] !== undefined) continue;
		if (c.attributes?.['data-name'] === name) return c;
		const hit = findRef(c, name);
		if (hit) return hit;
	}
	return undefined;
}

function text(node: unknown): string {
	if (typeof node === 'string') return node;
	if (!isTag(node)) return '';
	return (node.children ?? []).map(text).join('');
}

/** Read one source off a rune's tag: a ref's text, else its field-bag value,
 *  else `''`. The D3 rule — see the module comment. */
export function readRegistersSource(tag: AnyTag, source: string): string {
	const ref = findRef(tag, source);
	if (ref) return text(ref).trim();
	return readField(tag as never, source) ?? '';
}

/**
 * Sources a declaration names that the rune does not provide — WORK-611.
 *
 * The same rule `auditSchemaSources` applies to a schema table: a source
 * resolves if a node in the rune's output carries the name, if the field bag
 * has it, or if it is one of the rune's declared attributes (an optional
 * attribute left unset emits nothing, which is "this input did not exercise
 * it", not a typo). What is left resolves to nothing, ever.
 *
 * `tree` is the rune's `Markdoc.transform` output, before the identity
 * transform consumes the bag.
 */
export function auditRegistersSources(
	decl: RegistersDeclaration,
	tree: unknown,
	declaredAttributes: readonly string[] = [],
): Array<{ source: string; role: string }> {
	const root = findRuneRoot(tree);
	const bag = root ? parseBag(root) : {};
	const declared = new Set<string>();
	for (const a of declaredAttributes) {
		declared.add(a);
		declared.add(kebab(a));
	}
	return registersSources(decl).filter(
		({ source }) =>
			!(
				declared.has(source) ||
				declared.has(kebab(source)) ||
				Object.hasOwn(bag, source) ||
				(root && findRef(root, source))
			),
	);
}

function findRuneRoot(node: unknown): AnyTag | undefined {
	if (Array.isArray(node)) {
		for (const c of node) {
			const hit = findRuneRoot(c);
			if (hit) return hit;
		}
		return undefined;
	}
	if (!isTag(node)) return undefined;
	if (node.attributes?.['data-rune'] !== undefined) return node;
	return findRuneRoot(node.children ?? []);
}

function parseBag(tag: AnyTag): Record<string, unknown> {
	const raw = tag.attributes?.['data-rune-fields'];
	if (typeof raw !== 'string') return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** One line per declaration, for `inspect` and the reference. */
export function describeRegisters(decl: RegistersDeclaration, rune: string): string[] {
	const lines: string[] = [];
	const dataLine = (data: RegistersData | undefined) => {
		if (!data) return '(none)';
		if (!Array.isArray(data)) return `the JSON object in "${(data as { json: string }).json}"`;
		return dataEntries(data as RegistersDataEntry[])
			.map(({ key, source }) => (key === source ? key : `${key} <- ${source}`))
			.join(', ');
	};
	if (decl.entity) {
		const e = decl.entity;
		lines.push(`entity  ${e.type ?? rune}  (scope: ${e.scope ?? 'site'})`);
		lines.push(`  id      <- ${e.idFrom}`);
		lines.push(`  data    ${dataLine(e.data)}`);
		if (e.aliases) {
			lines.push(`  aliases <- ${e.aliases.from}, split on "${e.aliases.separator ?? ','}"`);
		}
	}
	if (decl.edge) {
		const e = decl.edge;
		const kind = typeof e.kind === 'string' ? e.kind : `data.${e.kind.field}`;
		const bidi =
			e.bidirectional === undefined
				? 'no'
				: typeof e.bidirectional === 'boolean'
					? String(e.bidirectional)
					: `data.${e.bidirectional.field}`;
		lines.push(`edge    ${e.type ?? rune}  (id: from→to)`);
		lines.push(`  from    <- ${e.from}`);
		lines.push(`  to      <- ${e.to}`);
		lines.push(`  kind    ${kind}`);
		lines.push(`  both    ${bidi}`);
		lines.push(`  data    from, to, ${e.data?.length ? `${dataLine(e.data)}, ` : ''}name`);
	}
	return lines;
}

export { dataEntries as registersDataEntries };
