import type { EntityRegistration, EntityRegistry, EntityEdge, ResolvedEdge } from '@refrakt-md/types';

/**
 * Concrete implementation of the cross-page entity registry.
 *
 * Maintains two indexes for efficient lookup:
 * - byTypeAndId: primary index for getAll() and getById()
 * - byTypeAndUrl: secondary index for getByUrl()
 *
 * Page-scoped entries (SPEC-060, WORK-256) are keyed internally by
 * `${sourceUrl}::${id}` in the primary index, so two pages can register
 * the same `(type, id)` without colliding. Site-scoped entries (the
 * default) keep using the bare `id` as their key, preserving the
 * pre-WORK-256 collision semantics (last-write-wins on `(type, id)`).
 *
 * On collision within the same scope, the last registration wins.
 */
export class EntityRegistryImpl implements EntityRegistry {
	private byTypeAndId = new Map<string, Map<string, EntityRegistration>>();
	private byTypeAndUrl = new Map<string, Map<string, EntityRegistration[]>>();
	/** Relationship graph (SPEC-072): outgoing edges keyed by `fromId`. */
	private edgesByFrom = new Map<string, EntityEdge[]>();

	register(entry: EntityRegistration): void {
		// Normalize empty-string sourceUrl to undefined — distinguishing
		// "explicitly empty" from "missing" isn't useful, and the resolver
		// treats both the same downstream.
		const normalized: EntityRegistration =
			entry.sourceUrl === '' ? { ...entry, sourceUrl: undefined } : entry;

		const key = primaryKey(normalized);

		// Primary index
		let typeMap = this.byTypeAndId.get(normalized.type);
		if (!typeMap) {
			typeMap = new Map();
			this.byTypeAndId.set(normalized.type, typeMap);
		}
		typeMap.set(key, normalized);

		// Secondary index — only meaningful when the entity has a sourceUrl.
		// Entries without one (plan content not published to any site, etc.)
		// are still in the primary index for getById; they just don't
		// participate in URL-based lookups.
		if (normalized.sourceUrl !== undefined) {
			let urlMap = this.byTypeAndUrl.get(normalized.type);
			if (!urlMap) {
				urlMap = new Map();
				this.byTypeAndUrl.set(normalized.type, urlMap);
			}
			const urlList = urlMap.get(normalized.sourceUrl);
			if (urlList) {
				const idx = urlList.findIndex(e => sameIdentity(e, normalized));
				if (idx >= 0) {
					urlList[idx] = normalized;
				} else {
					urlList.push(normalized);
				}
			} else {
				urlMap.set(normalized.sourceUrl, [normalized]);
			}
		}
	}

	/** All entities of a given type, in registration order */
	getAll(type: string): EntityRegistration[] {
		const typeMap = this.byTypeAndId.get(type);
		if (!typeMap) return [];
		return [...typeMap.values()];
	}

	/** All entities of a given type registered from a specific page URL */
	getByUrl(type: string, url: string): EntityRegistration[] {
		return this.byTypeAndUrl.get(type)?.get(url) ?? [];
	}

	/** Find a specific entity by type and id. Lookup order:
	 *  1. **Page-scoped match from `pageUrl`** — when `pageUrl` is provided,
	 *     check for a page-scoped entry registered from that page. Fragments
	 *     and trailing slashes are normalised so callers may pass the URL in
	 *     any shape an adapter produces.
	 *  2. **Site-scoped match** — the entry registered with the bare `id`.
	 *  3. **Cross-page fallback** — when neither of the above hits, scan
	 *     for any page-scoped entry with the same id from any page. This
	 *     is the SPEC-060 cross-page drawer-trigger path: a drawer
	 *     registered on page A is still findable when a xref on page B
	 *     references its id. Returns the first match in registration
	 *     order; cross-page id collisions are extraordinary enough that
	 *     callers wanting strict resolution can pass `pageUrl` and check
	 *     `sourceUrl` on the returned entry. */
	getById(type: string, id: string, pageUrl?: string): EntityRegistration | undefined {
		const typeMap = this.byTypeAndId.get(type);
		if (!typeMap) return undefined;
		if (pageUrl !== undefined) {
			const normalized = normalizePageUrl(stripFragment(pageUrl));
			const pageHit = typeMap.get(pageScopedKey(normalized, id));
			if (pageHit) return pageHit;
		}
		const siteHit = typeMap.get(id);
		if (siteHit) return siteHit;
		// Cross-page fallback for page-scoped entries with this id.
		for (const entry of typeMap.values()) {
			if (entry.id === id && entry.scope === 'page') return entry;
		}
		return undefined;
	}

	/** All registered entity type names */
	getTypes(): string[] {
		return [...this.byTypeAndId.keys()];
	}

	/** Contribute a directed relationship edge (SPEC-072). Exact
	 *  `(fromId, toId, kind)` duplicates are dropped; richer precedence is the
	 *  contributor's concern. */
	relate(edge: EntityEdge): void {
		let list = this.edgesByFrom.get(edge.fromId);
		if (!list) {
			list = [];
			this.edgesByFrom.set(edge.fromId, list);
		}
		if (list.some((e) => e.toId === edge.toId && e.kind === edge.kind)) return;
		list.push(edge);
	}

	/** Outgoing edges of `id`, each with its target entity resolved (SPEC-072).
	 *  Edges to unknown entities are dropped. */
	getRelated(id: string, opts?: { kind?: string | string[]; type?: string | string[] }): ResolvedEdge[] {
		const edges = this.edgesByFrom.get(id);
		if (!edges) return [];
		const kinds = opts?.kind === undefined ? undefined : new Set(toArray(opts.kind));
		const types = opts?.type === undefined ? undefined : new Set(toArray(opts.type));
		const out: ResolvedEdge[] = [];
		for (const edge of edges) {
			if (kinds && !kinds.has(edge.kind)) continue;
			const target = this.resolveTarget(edge);
			if (!target) continue;
			if (types && !types.has(target.type)) continue;
			out.push({ kind: edge.kind, fromId: edge.fromId, toId: edge.toId, target });
		}
		return out;
	}

	/** Resolve an edge's target entity: by `toType` when given, else by
	 *  scanning registered types for a site-scoped id match. */
	private resolveTarget(edge: EntityEdge): EntityRegistration | undefined {
		if (edge.toType) return this.getById(edge.toType, edge.toId);
		for (const type of this.byTypeAndId.keys()) {
			const hit = this.getById(type, edge.toId);
			if (hit) return hit;
		}
		return undefined;
	}
}

function toArray(v: string | string[]): string[] {
	return Array.isArray(v) ? v : [v];
}

/** Internal storage key for an entry. Site-scoped uses the bare id (so
 *  pre-WORK-256 callers keep working unchanged); page-scoped namespaces
 *  by the normalised page part of sourceUrl (fragment stripped, trailing
 *  slash trimmed) so the same id on the same page lands in one bucket
 *  regardless of href shape. A page-scoped entry without a usable
 *  sourceUrl falls back to the site-scoped key — that path is degenerate
 *  (it'll collide with site-scoped entries of the same id) and reflects
 *  a misconfiguration at the registration site rather than something the
 *  registry can recover from. */
function primaryKey(entry: EntityRegistration): string {
	if (entry.scope === 'page' && entry.sourceUrl) {
		return pageScopedKey(normalizePageUrl(stripFragment(entry.sourceUrl)), entry.id);
	}
	return entry.id;
}

function pageScopedKey(pageUrl: string, id: string): string {
	return `${pageUrl}::${id}`;
}

function stripFragment(url: string): string {
	const i = url.indexOf('#');
	return i === -1 ? url : url.slice(0, i);
}

/** Normalise a page URL for keying purposes — strip a trailing slash so
 *  adapters that emit `/x/` and ones that emit `/x` (or the resolver
 *  passing either form) coalesce into one bucket. Root (`/`) is preserved. */
function normalizePageUrl(url: string): string {
	if (url.length > 1 && url.endsWith('/')) return url.slice(0, -1);
	return url;
}

/** Two registrations refer to the same logical entry when their identity
 *  fields line up — used by the byTypeAndUrl secondary index to dedupe
 *  re-registrations from the same page. Scope participates because the
 *  same `(type, id)` can legitimately exist twice on a page when one is
 *  site-scoped and the other page-scoped (rare, but well-defined). */
function sameIdentity(a: EntityRegistration, b: EntityRegistration): boolean {
	return a.id === b.id && (a.scope ?? 'site') === (b.scope ?? 'site');
}
