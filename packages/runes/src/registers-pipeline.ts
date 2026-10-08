import Markdoc from '@markdoc/markdoc';
import type {
	EntityRegistration,
	EntityRegistry,
	PipelineContext,
	PluginPipelineHooks,
	PluginRune,
} from '@refrakt-md/types';
import { pluginRuneSchema } from './composed-rune.js';
import {
	readRegistersSource,
	registersDataEntries,
	registersFor,
	type RegistersDataEntry,
	type RegistersDeclaration,
	type RegistersIndex,
} from './lib/registers.js';

/**
 * The core registration participant — SPEC-144 / WORK-611.
 *
 * One implementation, run for every rune that carries a `registers` block, in
 * the existing Phase 2 (register) and Phase 3 (aggregate) slots. It is
 * instantiated once per declaring package and composed into that package's own
 * hook set by {@link composeRegistersHooks}, beside whatever hooks the package
 * still writes. That placement is what keeps a migration invisible to the
 * registry: registration happens in the same slot, in the same page and tree
 * order, under the same plugin name, as the hand-written hook it replaces.
 *
 * Phase 2 registers each declared entity, and each declared edge as an entry
 * of its own type (id `from→to`). Phase 3 builds the package's name index —
 * ids, then aliases, first alias wins — warns about edges whose endpoints name
 * no entity, and contributes each resolvable edge to the relationship graph
 * (`registry.relate`, SPEC-072), so `getRelated` answers for it.
 */

/** A rune name (its `data-rune`) and the block it declares. */
export interface DeclaredRegistration {
	rune: string;
	registers: RegistersDeclaration;
}

/** Collect the declarations from a rune record (`Plugin.runes` or the core
 *  catalog), keyed by the rune name its renderable carries as `data-rune`. */
export function collectRegistrations(
	runes: Record<string, { transform?: unknown; template?: unknown; schema?: unknown }>,
): DeclaredRegistration[] {
	const out: DeclaredRegistration[] = [];
	for (const [rune, entry] of Object.entries(runes)) {
		// A composed plugin rune (SPEC-153 D11) declares `registers` in its
		// definition; its schema is the one its template compiles to.
		const schema =
			typeof entry.template === 'string'
				? pluginRuneSchema(rune, entry as PluginRune)
				: (entry.transform ?? entry.schema);
		const registers = registersFor(schema);
		if (registers) out.push({ rune, registers });
	}
	return out;
}

type AnyTag = { attributes: Record<string, unknown>; children: unknown[] };

function walkTags(node: unknown, fn: (tag: AnyTag) => void): void {
	if (Markdoc.Tag.isTag(node)) {
		fn(node as unknown as AnyTag);
		for (const child of node.children) walkTags(child, fn);
	} else if (Array.isArray(node)) {
		for (const n of node) walkTags(n, fn);
	}
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Build a data bag from an ordered field list. */
function readData(tag: AnyTag, data: readonly RegistersDataEntry[]): Record<string, unknown> {
	const bag: Record<string, unknown> = {};
	for (const { key, source } of registersDataEntries(data)) {
		bag[key] = readRegistersSource(tag, source);
	}
	return bag;
}

export function createRegistersHooks(declared: DeclaredRegistration[]): PluginPipelineHooks {
	const byRune = new Map(declared.map((d) => [d.rune, d.registers]));
	// Entity types in declaration order, each with the alias rule of the first
	// rune that declared it.
	const entityTypes = new Map<string, RegistersDeclaration['entity']>();
	const edgeTypes = new Map<string, NonNullable<RegistersDeclaration['edge']>>();
	for (const { rune, registers } of declared) {
		if (registers.entity) {
			const type = registers.entity.type ?? rune;
			if (!entityTypes.has(type)) entityTypes.set(type, registers.entity);
		}
		if (registers.edge) {
			const type = registers.edge.type ?? rune;
			if (!edgeTypes.has(type)) edgeTypes.set(type, registers.edge);
		}
	}

	function registerTag(
		tag: AnyTag,
		rune: string,
		decl: RegistersDeclaration,
		url: string,
		registry: EntityRegistry,
		ctx: PipelineContext,
	): void {
		if (decl.entity) {
			const e = decl.entity;
			const type = e.type ?? rune;
			const id = readRegistersSource(tag, e.idFrom);
			if (!id) {
				ctx.warn(`${capitalise(type)} missing ${e.idFrom}: nothing registered`, url);
				return;
			}
			let data: Record<string, unknown>;
			if (e.data && !Array.isArray(e.data)) {
				const source = (e.data as { json: string }).json;
				const raw = readRegistersSource(tag, source);
				if (!raw) return;
				try {
					data = JSON.parse(raw) as Record<string, unknown>;
				} catch {
					ctx.warn(`Failed to parse ${type} ${source} as JSON`, url);
					return;
				}
			} else {
				data = readData(tag, (e.data as readonly RegistersDataEntry[] | undefined) ?? []);
			}
			registry.register({
				type,
				id,
				...(e.scope === 'page' ? { scope: 'page' as const } : {}),
				sourceUrl: url,
				data,
			});
			return;
		}

		const e = decl.edge!;
		const type = e.type ?? rune;
		const from = readRegistersSource(tag, e.from);
		const to = readRegistersSource(tag, e.to);
		if (!from || !to) {
			ctx.warn(`${capitalise(type)} missing ${e.from} or ${e.to} attribute`, url);
			return;
		}
		registry.register({
			type,
			id: `${from}→${to}`,
			sourceUrl: url,
			data: { from, to, ...readData(tag, e.data ?? []), name: `${from} → ${to}` },
		});
	}

	return {
		register(pages, registry, ctx) {
			for (const page of pages) {
				walkTags(page.renderable, (tag) => {
					const rune = tag.attributes['data-rune'];
					if (typeof rune !== 'string') return;
					const decl = byRune.get(rune);
					if (decl) registerTag(tag, rune, decl, page.url, registry, ctx);
				});
			}
		},

		aggregate(registry, ctx): RegistersIndex {
			const entityByName = new Map<string, EntityRegistration>();
			for (const [type, decl] of entityTypes) {
				const aliases = decl?.aliases;
				for (const entity of registry.getAll(type)) {
					entityByName.set(entity.id, entity);
					if (!aliases) continue;
					const value = String(entity.data[aliases.from] ?? '');
					for (const alias of value
						.split(aliases.separator ?? ',')
						.map((a) => a.trim())
						.filter(Boolean)) {
						if (!entityByName.has(alias)) entityByName.set(alias, entity);
					}
				}
			}

			for (const [type, edge] of edgeTypes) {
				for (const entry of registry.getAll(type)) {
					const from = String(entry.data.from ?? '');
					const to = String(entry.data.to ?? '');
					const source = entityByName.get(from);
					const target = entityByName.get(to);
					if (!source)
						ctx.warn(`${capitalise(type)} references unknown entity "${from}"`, entry.sourceUrl);
					if (!target)
						ctx.warn(`${capitalise(type)} references unknown entity "${to}"`, entry.sourceUrl);
					if (!source || !target || !registry.relate) continue;

					const kind =
						typeof edge.kind === 'string'
							? edge.kind
							: String(entry.data[edge.kind.field] ?? '') || type;
					const both =
						edge.bidirectional === undefined
							? false
							: typeof edge.bidirectional === 'boolean'
								? edge.bidirectional
								: String(entry.data[edge.bidirectional.field] ?? '') === 'true';
					// Endpoints are canonicalised through the index, so an edge
					// written against an alias lands on the entity's id — the only
					// key `getRelated` can be asked with.
					registry.relate({
						fromId: source.id,
						toId: target.id,
						kind,
						fromType: source.type,
						toType: target.type,
					});
					if (both) {
						registry.relate({
							fromId: target.id,
							toId: source.id,
							kind,
							fromType: target.type,
							toType: source.type,
						});
					}
				}
			}

			return { entityByName };
		},
	};
}

/**
 * Put the declarative participant into a package's hook set, beside its own
 * hooks rather than instead of them.
 *
 * - **register** — the declared registrations run first, then the package's
 *   own `register`, if it still has one.
 * - **aggregate** — the declared Phase 3 work (name index, edge warnings,
 *   `relate`) always runs. The package's slot in `aggregated` gets the
 *   package's own `aggregate` result when it writes one, and the name index
 *   ({@link RegistersIndex}) when it does not — which is how a `postProcess`
 *   written against a deleted hand-written `aggregate` keeps reading the same
 *   slot.
 * - everything else (`configure`, `preprocess`, `contributePages`,
 *   `postProcess`) is the package's, untouched.
 *
 * Returns the package's hooks unchanged when it declares nothing.
 */
export function composeRegistersHooks(
	hooks: PluginPipelineHooks | undefined,
	declared: DeclaredRegistration[],
): PluginPipelineHooks | undefined {
	if (declared.length === 0) return hooks;
	const generic = createRegistersHooks(declared);
	if (!hooks) return generic;
	const own = hooks;
	return {
		...own,
		register: own.register
			? (pages, registry, ctx) => {
					generic.register!(pages, registry, ctx);
					own.register!(pages, registry, ctx);
				}
			: generic.register,
		aggregate: own.aggregate
			? (registry, ctx) => {
					generic.aggregate!(registry, ctx);
					return own.aggregate!(registry, ctx);
				}
			: generic.aggregate,
	};
}
