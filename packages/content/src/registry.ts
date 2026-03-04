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
		// Primary index
		let typeMap = this.byTypeAndId.get(entry.type);
		if (!typeMap) {
			typeMap = new Map();
			this.byTypeAndId.set(entry.type, typeMap);
		}
		typeMap.set(entry.id, entry);

		// Secondary index
		let urlMap = this.byTypeAndUrl.get(entry.type);
		if (!urlMap) {
			urlMap = new Map();
			this.byTypeAndUrl.set(entry.type, urlMap);
		}
		const urlList = urlMap.get(entry.sourceUrl);
		if (urlList) {
			// Replace existing entry with same id, or append
			const idx = urlList.findIndex(e => e.id === entry.id);
			if (idx >= 0) {
				urlList[idx] = entry;
			} else {
				urlList.push(entry);
			}
		} else {
			urlMap.set(entry.sourceUrl, [entry]);
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
}
