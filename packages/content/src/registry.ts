import type { EntityRegistration, EntityRegistry } from '@refrakt-md/types';

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

	/** Find a specific entity by type and id. Page-scoped match from
	 *  `pageUrl` (if any) wins over a site-scoped match of the same id. */
	getById(type: string, id: string, pageUrl?: string): EntityRegistration | undefined {
		const typeMap = this.byTypeAndId.get(type);
		if (!typeMap) return undefined;
		if (pageUrl !== undefined) {
			const pageHit = typeMap.get(pageScopedKey(pageUrl, id));
			if (pageHit) return pageHit;
		}
		return typeMap.get(id);
	}

	/** All registered entity type names */
	getTypes(): string[] {
		return [...this.byTypeAndId.keys()];
	}
}

/** Internal storage key for an entry. Site-scoped uses the bare id (so
 *  pre-WORK-256 callers keep working unchanged); page-scoped namespaces
 *  by sourceUrl so same-id-from-different-pages don't collide. A page-
 *  scoped entry without a usable sourceUrl falls back to the site-scoped
 *  key — that path is degenerate (it'll collide with site-scoped entries
 *  of the same id) and reflects a misconfiguration at the registration
 *  site rather than something the registry can recover from. */
function primaryKey(entry: EntityRegistration): string {
	if (entry.scope === 'page' && entry.sourceUrl) {
		return pageScopedKey(entry.sourceUrl, entry.id);
	}
	return entry.id;
}

function pageScopedKey(sourceUrl: string, id: string): string {
	return `${sourceUrl}::${id}`;
}

/** Two registrations refer to the same logical entry when their identity
 *  fields line up — used by the byTypeAndUrl secondary index to dedupe
 *  re-registrations from the same page. Scope participates because the
 *  same `(type, id)` can legitimately exist twice on a page when one is
 *  site-scoped and the other page-scoped (rare, but well-defined). */
function sameIdentity(a: EntityRegistration, b: EntityRegistration): boolean {
	return a.id === b.id && (a.scope ?? 'site') === (b.scope ?? 'site');
}
