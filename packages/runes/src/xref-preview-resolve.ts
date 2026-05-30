/**
 * xref `preview="drawer"` resolver (SPEC-078, WORK-302).
 *
 * Runs BEFORE the drawer hoist pass. Walks the page renderable, finds
 * xref placeholders carrying `data-xref-preview="drawer"`, and rewrites
 * each as an inline `<a href="#drawer-{entityId}">` (with aria attrs)
 * accompanied by a `hoist-drawer` sentinel that the drawer pipeline
 * (WORK-300) picks up to render the actual drawer at the page root.
 *
 * Non-preview xref placeholders pass through unchanged — the existing
 * `resolveXrefs` pass (later in the pipeline) handles those.
 *
 * Also registers a hoist builder for the `xref` source. The builder
 * looks up the entity by id and emits a drawer whose body is an
 * `expand-pending` placeholder for the entity — the `resolveExpands`
 * pass that runs *after* the hoist substitutes the placeholder with
 * the entity's actual content, so the drawer body ends up identical
 * to a manual `{% drawer %}{% expand "X" /%}{% /drawer %}`.
 */

import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import {
	HOIST_DRAWER_SENTINEL,
	registerHoistBuilder,
	type HoistBuildContext,
} from './drawer-pipeline.js';
import { XREF_RUNE_MARKER } from './tags/xref.js';
import { EXPAND_PLACEHOLDER_MARKER } from './tags/expand.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

function isTag(node: unknown): node is TagNode {
	return Tag.isTag(node as never);
}

/**
 * Walk a page's renderable. For each xref placeholder with
 * `data-xref-preview="drawer"`:
 *
 *   - Replace the placeholder span with `<a href="#drawer-{id}">` carrying
 *     `aria-controls`, `aria-expanded="false"`, `data-target-type="drawer"`.
 *   - Emit a sibling `<meta data-field="hoist-drawer">` sentinel with
 *     `data-source="xref"` + the entity id + the authored label, for the
 *     drawer pipeline to consume.
 *
 * Non-preview xref placeholders are left for `resolveXrefs` to handle in
 * its own pass.
 */
export function resolveXrefPreviews(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry> | undefined,
	ctx: PipelineContext,
): unknown {
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) {
			let mutated = false;
			const out: unknown[] = [];
			for (const c of node) {
				const w = walk(c);
				if (w !== c) mutated = true;
				if (Array.isArray(w)) out.push(...w);
				else out.push(w);
			}
			return mutated ? out : node;
		}
		if (!isTag(node)) return node;
		const tag = node;

		if (
			tag.attributes?.['data-rune'] === XREF_RUNE_MARKER
			&& tag.attributes?.['data-xref-preview'] === 'drawer'
		) {
			return resolveOne(tag, registry, ctx, pageUrl);
		}

		if (!tag.children || tag.children.length === 0) return tag;
		let mutated = false;
		const next: unknown[] = [];
		for (const c of tag.children) {
			const w = walk(c);
			if (w !== c) mutated = true;
			if (Array.isArray(w)) next.push(...w);
			else next.push(w);
		}
		if (!mutated) return tag;
		return new Tag(tag.name, tag.attributes, next as never[]);
	};
	return walk(renderable);
}

function resolveOne(
	placeholder: TagNode,
	registry: Readonly<EntityRegistry> | undefined,
	ctx: PipelineContext,
	pageUrl: string,
): RenderableTreeNode[] {
	const attrs = placeholder.attributes as Record<string, unknown>;
	const id = String(attrs['data-xref-id'] ?? '');
	const authoredLabel = attrs['data-xref-label'] as string | undefined;

	if (!id) {
		ctx.warn(`xref preview placeholder on ${pageUrl} has no entity id`, pageUrl);
		return [placeholder];
	}

	// Try to resolve the entity title for the inline link label when the
	// author didn't supply an explicit `label=`. Fall back to the id.
	const entity = registry ? findEntity(registry, id) : undefined;
	const label = authoredLabel
		|| (entity ? entityDisplayLabel(entity) : id);
	const entityTitle = entity ? entityDisplayLabel(entity) : id;

	const slug = id;

	const anchor = new Tag(
		'a',
		{
			class: 'rf-xref',
			href: `#drawer-${slug}`,
			'aria-controls': `drawer-${slug}`,
			'aria-expanded': 'false',
			'data-target-type': 'drawer',
			'data-xref-id': id,
		},
		[label],
	);

	const sentinel = new Tag('meta', {
		'data-field': HOIST_DRAWER_SENTINEL,
		'data-source': 'xref',
		'data-target-id': slug,
		'data-title': entityTitle,
		'data-entity-id': id,
	});

	return [anchor, sentinel];
}

function findEntity(
	registry: Readonly<EntityRegistry>,
	id: string,
): EntityRegistration | undefined {
	const types = registry.getTypes?.() ?? [];
	for (const type of types) {
		const e = registry.getById(type, id);
		if (e) return e;
	}
	return undefined;
}

function entityDisplayLabel(entity: EntityRegistration): string {
	const data = entity.data as Record<string, unknown>;
	return String(data.title ?? data.name ?? entity.id);
}

// ─────────────────────────────────────────────────────────────────────
// Hoist builder for the `xref` source — looks up the entity, builds a
// drawer with an expand-pending body that `resolveExpands` resolves
// downstream, and a chrome footer linking to the entity's page URL.
// ─────────────────────────────────────────────────────────────────────

function buildXrefHoist(
	payload: Record<string, string>,
	context: HoistBuildContext,
): TagNode | null {
	const entityId = payload['entity-id'] || payload['target-id'];
	const targetId = payload['target-id'];
	const title = payload.title || entityId;

	if (!entityId || !targetId) {
		context.ctx.warn(
			`xref hoist payload missing required entity-id or target-id`,
			context.pageUrl,
		);
		return null;
	}

	const entity = context.registry ? findEntity(context.registry, entityId) : undefined;

	// Header — title + close button (same shape author-declared drawers use).
	const titleHeading = new Tag('h3', { 'data-name': 'title', class: 'rf-drawer__title' }, [title]);
	const closeButton = new Tag('button', {
		type: 'button',
		'aria-label': 'Close',
		hidden: true,
		'data-name': 'close',
		class: 'rf-drawer__close',
	}, ['×']);
	const header = new Tag('header', {
		'data-name': 'header',
		class: 'rf-drawer__header',
	}, [titleHeading, closeButton]);

	// Body — an expand-pending placeholder. `resolveExpands` runs after
	// `hoistPreviewDrawers` in the pipeline and substitutes this with the
	// entity's actual content, identical to a hand-authored
	// `{% drawer %}{% expand "X" /%}{% /drawer %}` composition.
	const expandPlaceholder = new Tag(
		'div',
		{
			'data-rune': EXPAND_PLACEHOLDER_MARKER,
			'data-expand-id': entityId,
		},
		[],
	);
	const bodyChildren: RenderableTreeNode[] = [expandPlaceholder];
	const body = new Tag('div', { 'data-name': 'body', class: 'rf-drawer__body' }, bodyChildren);

	// Footer — link to the entity's page URL (when one resolves). Hides
	// silently for entities without a sourceUrl (heading entities,
	// drawer-target entities).
	const footerHref = entity?.sourceUrl ?? '';
	const footer = footerHref
		? new Tag(
			'footer',
			{ 'data-name': 'footer', class: 'rf-drawer__footer' },
			[
				new Tag('a', { href: footerHref }, [`View full page →`]),
			],
		)
		: null;

	const drawerChildren: RenderableTreeNode[] = [header, body];
	if (footer) drawerChildren.push(footer);

	return new Tag(
		'section',
		{
			id: `drawer-${targetId}`,
			class: 'rf-drawer',
			'data-rune': 'drawer',
			'data-drawer-id': targetId,
			'data-side': 'right',
			'data-size': 'md',
		},
		drawerChildren,
	);
}

// Register at module load.
registerHoistBuilder('xref', buildXrefHoist);
