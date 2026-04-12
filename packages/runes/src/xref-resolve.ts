/**
 * Xref (cross-reference) resolution utilities.
 *
 * Walks a Markdoc renderable tree and converts xref placeholder spans
 * (produced by the xref/ref tag transform) into resolved `<a>` links
 * using the entity registry.
 */

import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { XREF_RUNE_MARKER } from './tags/xref.js';

/**
 * Find an entity by exact ID across all types in the registry.
 * If typeHint is provided, only search that type.
 */
function findEntityById(
	registry: Readonly<EntityRegistry>,
	id: string,
	typeHint?: string,
): { entity: EntityRegistration; ambiguous: false } | undefined {
	const types = typeHint ? [typeHint] : registry.getTypes();
	for (const type of types) {
		const entity = registry.getById(type, id);
		if (entity) return { entity, ambiguous: false };
	}
	return undefined;
}

/**
 * Find entities by name/title match (case-insensitive) across all types.
 * If typeHint is provided, only search that type.
 */
function findEntitiesByName(
	registry: Readonly<EntityRegistry>,
	name: string,
	typeHint?: string,
): EntityRegistration[] {
	const nameLower = name.toLowerCase();
	const types = typeHint ? [typeHint] : registry.getTypes();
	const matches: EntityRegistration[] = [];

	for (const type of types) {
		for (const entity of registry.getAll(type)) {
			const entityName = (entity.data.name as string) ?? '';
			const entityTitle = (entity.data.title as string) ?? '';
			if (entityName.toLowerCase() === nameLower || entityTitle.toLowerCase() === nameLower) {
				matches.push(entity);
			}
		}
	}

	return matches;
}

/** Resolve an entity's URL for use as an href */
function resolveEntityHref(entity: EntityRegistration): string {
	const baseUrl = (entity.data.url as string) || entity.sourceUrl;
	const headingId = entity.data.headingId as string | undefined;
	if (headingId) return `${baseUrl}#${headingId}`;
	return baseUrl;
}

/**
 * Walk a Markdoc renderable tree, resolving any xref placeholders into
 * clickable links using the entity registry. Unresolved xrefs become
 * styled spans with an `rf-xref--unresolved` class.
 */
export function resolveXrefs(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry>,
	ctx: PipelineContext,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveXrefs(c, pageUrl, registry, ctx)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	// Check if this is an xref placeholder
	if (tag.attributes?.['data-rune'] === XREF_RUNE_MARKER) {
		const id = tag.attributes['data-xref-id'] as string | undefined;
		const label = tag.attributes['data-xref-label'] as string | undefined;
		const typeHint = tag.attributes['data-xref-type'] as string | undefined;

		if (!id) {
			return new Tag('span', {
				class: 'rf-xref rf-xref--unresolved',
			}, [label || '?']);
		}

		// Try exact ID match first
		const idMatch = findEntityById(registry, id, typeHint);
		if (idMatch) {
			const entity = idMatch.entity;
			const href = resolveEntityHref(entity);
			const text = label || (entity.data.title as string) || (entity.data.name as string) || (entity.data.text as string) || id;

			if (entity.sourceUrl === pageUrl) {
				ctx.info(`xref "${id}" on ${pageUrl} — references itself`, pageUrl);
			}

			return new Tag('a', {
				class: `rf-xref rf-xref--${entity.type}`,
				href,
				'data-entity-type': entity.type,
				'data-entity-id': entity.id,
			}, [text]);
		}

		// Try name/title match
		const nameMatches = findEntitiesByName(registry, id, typeHint);

		if (nameMatches.length === 1) {
			const entity = nameMatches[0];
			const href = resolveEntityHref(entity);
			const text = label || (entity.data.title as string) || (entity.data.name as string) || (entity.data.text as string) || id;

			if (entity.sourceUrl === pageUrl) {
				ctx.info(`xref "${id}" on ${pageUrl} — references itself`, pageUrl);
			}

			return new Tag('a', {
				class: `rf-xref rf-xref--${entity.type}`,
				href,
				'data-entity-type': entity.type,
				'data-entity-id': entity.id,
			}, [text]);
		}

		if (nameMatches.length > 1) {
			const matchList = nameMatches
				.map(e => `${e.type} "${(e.data.title as string) || (e.data.name as string) || e.id}" on ${e.sourceUrl}`)
				.join(', ');
			ctx.warn(
				`xref "${id}" on ${pageUrl} — matches ${nameMatches.length} entities (${matchList}). Add type hint to disambiguate.`,
				pageUrl,
			);

			// Use first match
			const entity = nameMatches[0];
			const href = resolveEntityHref(entity);
			const text = label || (entity.data.title as string) || (entity.data.name as string) || (entity.data.text as string) || id;

			return new Tag('a', {
				class: `rf-xref rf-xref--${entity.type}`,
				href,
				'data-entity-type': entity.type,
				'data-entity-id': entity.id,
			}, [text]);
		}

		// No match — unresolved
		ctx.warn(`xref "${id}" on ${pageUrl} — entity not found`, pageUrl);
		return new Tag('span', {
			class: 'rf-xref rf-xref--unresolved',
			'data-entity-id': id,
		}, [label || id]);
	}

	// Recurse into children
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveXrefs(c, pageUrl, registry, ctx)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}
