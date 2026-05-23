/**
 * Xref (cross-reference) resolution utilities.
 *
 * Walks a Markdoc renderable tree and converts xref placeholder spans
 * (produced by the xref/ref tag transform) into resolved `<a>` links.
 *
 * Resolution model (SPEC-065):
 *
 * 1. **Entity lookup** — find the entity in the registry (exact ID, then
 *    case-insensitive name/title). Captures metadata (label, type) for use
 *    in rendering even if the URL ends up coming from a pattern.
 * 2. **URL resolution** — if the matched entity has a usable `sourceUrl`,
 *    that's the href (`data-xref-source="registry"`). Otherwise iterate
 *    configured patterns (compiled via `compileXrefPatterns`); first regex
 *    that matches the ID provides the URL (`data-xref-source="pattern"`).
 * 3. **Unresolved fallback** — if neither the entity nor any pattern produces
 *    a URL, render `rf-xref--unresolved` with a build warning.
 *
 * The separation lets entity-lookup and URL-resolution succeed independently.
 * SPEC-064 plan content registered without a `sourceUrl` (because it isn't
 * published to any site) still resolves correctly: the registry provides
 * label and type; user-configured patterns provide the URL.
 */

import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { XREF_RUNE_MARKER } from './tags/xref.js';
import type { CompiledXrefPattern } from './xref-patterns.js';

/** Tagged union describing where a xref's URL came from. Surfaces as the
 *  `data-xref-source` attribute on the rendered anchor. */
type XrefUrlSource = 'registry' | 'pattern';

interface ResolvedXref {
	href: string;
	label: string;
	type: string;
	source: XrefUrlSource;
	/** When a registry entity was matched, its type — even if the URL came
	 *  from a pattern. Drawer and any future addressable-rune behaviors
	 *  query against this on the rendered anchor as `data-target-type`. */
	targetType?: string;
	/** When a registry entity was matched, its ID. */
	entityId?: string;
}

/** Find an entity by exact ID across all types in the registry. `pageUrl`
 *  scopes the search so page-scoped entries from the resolving page take
 *  precedence over site-scoped entries of the same id (SPEC-060). */
function findEntityById(
	registry: Readonly<EntityRegistry>,
	id: string,
	pageUrl: string,
	typeHint?: string,
): EntityRegistration | undefined {
	const types = typeHint ? [typeHint] : registry.getTypes();
	for (const type of types) {
		const entity = registry.getById(type, id, pageUrl);
		if (entity) return entity;
	}
	return undefined;
}

/** Find entities by case-insensitive name/title match. */
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

/** Compute the canonical URL for a registry-matched entity, honoring
 *  per-entity `data.url` overrides and `data.headingId` fragment hints. */
function resolveEntityHref(entity: EntityRegistration): string | undefined {
	const baseUrl = (entity.data.url as string) || entity.sourceUrl;
	if (!baseUrl) return undefined;
	const headingId = entity.data.headingId as string | undefined;
	return headingId ? `${baseUrl}#${headingId}` : baseUrl;
}

/** Choose the rendered label for a resolved xref. Priority: explicit `label=`
 *  attribute > entity `data.title` / `data.name` / `data.text` > the raw ID. */
function deriveEntityLabel(
	id: string,
	authoredLabel: string | undefined,
	entity: EntityRegistration | undefined,
): string {
	if (authoredLabel) return authoredLabel;
	if (entity) {
		const title = entity.data.title as string | undefined;
		const name = entity.data.name as string | undefined;
		const text = entity.data.text as string | undefined;
		return title || name || text || id;
	}
	return id;
}

/** Match `{name}` placeholders in template / label strings. */
const PLACEHOLDER_RE = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;

/** URL-encode per segment: split on `/`, encode each segment with
 *  `encodeURIComponent`, rejoin with `/`. Single-segment values are
 *  unaffected (the split is a no-op); multi-segment paths preserve their
 *  slash structure. This is what the SPEC-065 "per-segment encoding"
 *  contract delivers. */
function encodePerSegment(value: string): string {
	return value.split('/').map(encodeURIComponent).join('/');
}

/** Substitute `{id}` and `{name}` placeholders in a template, with each
 *  substituted value encoded per URL segment. */
function applyTemplate(
	template: string,
	id: string,
	groups: Record<string, string | undefined>,
): string {
	return template.replace(PLACEHOLDER_RE, (_match, name: string) => {
		const value = name === 'id' ? id : (groups[name] ?? '');
		return encodePerSegment(value);
	});
}

/** Apply a label template without URL encoding — labels are human-readable
 *  text, not URL components. Missing named groups render as empty strings. */
function applyLabelTemplate(
	template: string,
	id: string,
	groups: Record<string, string | undefined>,
): string {
	return template.replace(PLACEHOLDER_RE, (_match, name: string) => {
		if (name === 'id') return id;
		return groups[name] ?? '';
	});
}

/** Try each pattern in order; first match wins. Returns the resolved URL
 *  along with the pattern's `type` and computed `label`. */
function tryPatternMatch(
	id: string,
	patterns: CompiledXrefPattern[],
): { url: string; label: string; type: string } | undefined {
	for (const p of patterns) {
		const m = p.match.exec(id);
		if (!m) continue;
		const groups = (m.groups ?? {}) as Record<string, string | undefined>;
		return {
			url: applyTemplate(p.template, id, groups),
			label: applyLabelTemplate(p.label, id, groups),
			type: p.type,
		};
	}
	return undefined;
}

interface ResolveContext {
	pageUrl: string;
	registry: Readonly<EntityRegistry>;
	patterns: CompiledXrefPattern[];
	ctx: PipelineContext;
}

/** Reduce an absolute href that points at the current page + fragment down
 *  to the fragment alone. Handles both URL shapes seen in practice — page
 *  URLs that end with a trailing slash and ones that don't. Returns the
 *  original href when it doesn't target the current page. */
function compactSamePageHref(href: string, pageUrl: string): string {
	const hashIdx = href.indexOf('#');
	if (hashIdx < 0) return href;
	const hrefPath = href.slice(0, hashIdx);
	const fragment = href.slice(hashIdx);
	// Normalise trailing slashes for the comparison so `/x/` and `/x` are
	// treated as the same page (different adapters normalise differently).
	const stripTrail = (s: string) => s.endsWith('/') ? s.slice(0, -1) : s;
	if (stripTrail(hrefPath) === stripTrail(pageUrl)) return fragment;
	return href;
}

/** Resolve a single xref placeholder. Drives the SPEC-065 chain:
 *  entity lookup → URL resolution → unresolved fallback. */
function resolvePlaceholder(
	id: string,
	authoredLabel: string | undefined,
	typeHint: string | undefined,
	rc: ResolveContext,
): { tag: typeof Tag.prototype } {
	// Step 1: entity lookup (capture metadata, may or may not yield a URL).
	let entity = findEntityById(rc.registry, id, rc.pageUrl, typeHint);
	if (!entity) {
		const nameMatches = findEntitiesByName(rc.registry, id, typeHint);
		if (nameMatches.length === 1) {
			entity = nameMatches[0];
		} else if (nameMatches.length > 1) {
			const matchList = nameMatches
				.map(e => `${e.type} "${(e.data.title as string) || (e.data.name as string) || e.id}" on ${e.sourceUrl ?? '(no URL)'}`)
				.join(', ');
			rc.ctx.warn(
				`xref "${id}" on ${rc.pageUrl} — matches ${nameMatches.length} entities (${matchList}). Add type hint to disambiguate.`,
				rc.pageUrl,
			);
			entity = nameMatches[0];
		}
	}

	const entityHref = entity ? resolveEntityHref(entity) : undefined;

	// Step 2a: URL from the entity, if any.
	let resolved: ResolvedXref | undefined;
	if (entity && entityHref) {
		resolved = {
			href: entityHref,
			label: deriveEntityLabel(id, authoredLabel, entity),
			type: entity.type,
			source: 'registry',
			targetType: entity.type,
			entityId: entity.id,
		};
	} else {
		// Step 2b: URL from a pattern. Entity metadata still wins for label/type
		// when present; the pattern only contributes the URL in that case.
		const patternHit = tryPatternMatch(id, rc.patterns);
		if (patternHit) {
			resolved = {
				href: patternHit.url,
				label: deriveEntityLabel(
					id,
					authoredLabel,
					entity,
				) || patternHit.label,
				type: entity?.type ?? patternHit.type,
				source: 'pattern',
				targetType: entity?.type,
				entityId: entity?.id,
			};
			// When no entity is matched, the label has to come from the
			// pattern (or the authored label); `deriveEntityLabel` falls back
			// to the raw ID which is rarely what the author wanted from a
			// pattern. Use the pattern label in that case.
			if (!entity && !authoredLabel) {
				resolved.label = patternHit.label;
			}
		}
	}

	// Step 3: unresolved.
	if (!resolved) {
		rc.ctx.warn(`xref "${id}" on ${rc.pageUrl} — entity not found`, rc.pageUrl);
		return {
			tag: new Tag('span', {
				class: 'rf-xref rf-xref--unresolved',
				'data-xref-id': id,
			}, [authoredLabel || id]),
		};
	}

	// Self-reference detection on the resolved href (covers both registry and
	// pattern cases — a pattern that produces a same-page URL is still a
	// self-reference).
	if (resolved.href === rc.pageUrl) {
		rc.ctx.info(`xref "${id}" on ${rc.pageUrl} — references itself`, rc.pageUrl);
	}

	// Same-page anchor compaction: when the entity's resolved href is the
	// current page plus a fragment, drop the page URL portion so the link
	// renders as a fragment-only anchor (`#drawer-x`) — matches the SPEC-060
	// drawer-trigger contract and is how authors normally write same-page
	// anchors. Behaves identically to the absolute form for the browser; the
	// progressive-enhancement layer (drawer behaviors) reads the fragment
	// directly without needing to compare against location.pathname.
	const renderedHref = compactSamePageHref(resolved.href, rc.pageUrl);

	const attributes: Record<string, unknown> = {
		class: `rf-xref rf-xref--${resolved.type}`,
		href: renderedHref,
		'data-xref-id': resolved.entityId ?? id,
		'data-xref-source': resolved.source,
	};
	if (resolved.targetType) {
		attributes['data-target-type'] = resolved.targetType;
	}

	return { tag: new Tag('a', attributes, [resolved.label]) };
}

/**
 * Walk a Markdoc renderable tree, resolving any xref placeholders into
 * clickable links using the entity registry and configured patterns.
 * Unresolved xrefs become styled spans with an `rf-xref--unresolved` class.
 */
export function resolveXrefs(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry>,
	patterns: CompiledXrefPattern[],
	ctx: PipelineContext,
): unknown {
	const rc: ResolveContext = { pageUrl, registry, patterns, ctx };
	return walk(renderable, rc);
}

function walk(renderable: unknown, rc: ResolveContext): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const arr = renderable as unknown[];
			const newChildren = arr.map(c => walk(c, rc));
			if (newChildren.every((c, i) => c === arr[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	if (tag.attributes?.['data-rune'] === XREF_RUNE_MARKER) {
		const id = tag.attributes['data-xref-id'] as string | undefined;
		const label = tag.attributes['data-xref-label'] as string | undefined;
		const typeHint = tag.attributes['data-xref-type'] as string | undefined;

		if (!id) {
			return new Tag('span', {
				class: 'rf-xref rf-xref--unresolved',
			}, [label || '?']);
		}

		return resolvePlaceholder(id, label, typeHint, rc).tag;
	}

	const newChildren = (tag.children ?? []).map((c: unknown) => walk(c, rc));
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}
