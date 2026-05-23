import type { EntityRegistration, EntityRegistry } from '@refrakt-md/types';

/**
 * Concrete implementation of the cross-page entity registry.
 *
 * Maintains two indexes for efficient lookup:
 * - byTypeAndId: primary index for getAll() and getById()
 * - byTypeAndUrl: secondary index for getByUrl()
 *
 * On collision (same type + id registered twice), the last registration wins.
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

		// Primary index
		let typeMap = this.byTypeAndId.get(normalized.type);
		if (!typeMap) {
			typeMap = new Map();
			this.byTypeAndId.set(normalized.type, typeMap);
		}
		typeMap.set(normalized.id, normalized);

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
				const idx = urlList.findIndex(e => e.id === normalized.id);
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

	/** Find a specific entity by type and id */
	getById(type: string, id: string): EntityRegistration | undefined {
		return this.byTypeAndId.get(type)?.get(id);
	}

	/** All registered entity type names */
	getTypes(): string[] {
		return [...this.byTypeAndId.keys()];
	}
}
