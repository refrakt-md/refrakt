/**
 * Drawer pipeline hooks (SPEC-060, WORK-257).
 *
 * - **Register** walks each page's renderable for drawer tags
 *   (`data-rune="drawer"`), and adds each as a page-scoped entity
 *   (`type: 'drawer'`, `scope: 'page'`, `sourceUrl: "${pageUrl}#drawer-${id}"`).
 *   Page scope means two pages can both declare `id="auth"` without
 *   colliding in the site-wide registry (WORK-256).
 *
 * - **postProcess** resolves drawer title heading levels for drawers that
 *   were authored without an explicit `headingLevel`. The title carries
 *   a `data-drawer-title-auto` marker emitted by the schema; the walk
 *   tracks document outline depth (the most recent `<h{n}>` seen) and
 *   rewrites the marked tag to `h{n+1}` (clamped 1..6, default h2 when
 *   no preceding heading exists).
 */

import Markdoc from '@markdoc/markdoc';
import type { EntityRegistry, PipelineContext, TransformedPage } from '@refrakt-md/types';
import { DRAWER_TITLE_AUTO_MARKER } from './tags/drawer.js';

const { Tag } = Markdoc;

const HEADING_TAG_RE = /^h([1-6])$/;

/** Read a `data-*` attribute from a tag, treating undefined as undefined. */
function readDataAttr(tag: InstanceType<typeof Tag>, key: string): string | undefined {
	const v = (tag.attributes as Record<string, unknown> | undefined)?.[key];
	return typeof v === 'string' ? v : undefined;
}

/** Read the `content` of a property meta tag (`<meta data-field="...">`)
 *  immediately under the drawer tag. The schema emits side/size/shortcut as
 *  meta tags; the identity-transform engine consumes them later and stamps
 *  them as `data-side` etc. on the wrapper. The register hook runs before
 *  the engine, so we have to read directly from the meta tags. */
function readPropertyMeta(drawerTag: InstanceType<typeof Tag>, field: string): string | undefined {
	for (const child of drawerTag.children ?? []) {
		if (!Tag.isTag(child as never)) continue;
		const c = child as InstanceType<typeof Tag>;
		if (c.name !== 'meta') continue;
		if ((c.attributes as Record<string, unknown> | undefined)?.['data-field'] !== field) continue;
		const content = (c.attributes as Record<string, unknown> | undefined)?.['content'];
		return typeof content === 'string' ? content : undefined;
	}
	return undefined;
}

/**
 * Walk the renderable tree of every page and register each drawer rune
 * as a page-scoped entity. Each drawer surfaces in the registry as
 * `{ type: 'drawer', id, scope: 'page', sourceUrl: '<pageUrl>#drawer-<id>' }`
 * with `data.title`, `data.side`, `data.size`, `data.shortcut` for
 * downstream consumers (xref resolver, registry-driven tooling).
 */
export function registerDrawers(
	pages: readonly TransformedPage[],
	registry: EntityRegistry,
	ctx: PipelineContext,
): void {
	for (const page of pages) {
		const drawersOnPage: Array<{
			id: string;
			title?: string;
			side: string;
			size: string;
			shortcut?: string;
		}> = [];

		const seenIds = new Set<string>();

		walkForDrawers(page.renderable, (tag) => {
			const id = readDataAttr(tag, 'data-drawer-id');
			if (!id) {
				ctx.error(
					'drawer rune is missing required `id` attribute',
					page.url,
				);
				return;
			}
			if (seenIds.has(id)) {
				ctx.warn(
					`drawer id="${id}" is declared more than once on this page — last declaration wins`,
					page.url,
				);
			}
			seenIds.add(id);

			drawersOnPage.push({
				id,
				title: extractTitleText(tag),
				side: readPropertyMeta(tag, 'side') ?? 'right',
				size: readPropertyMeta(tag, 'size') ?? 'md',
				shortcut: readPropertyMeta(tag, 'shortcut'),
			});
		});

		for (const d of drawersOnPage) {
			registry.register({
				type: 'drawer',
				id: d.id,
				scope: 'page',
				sourceUrl: `${page.url}#drawer-${d.id}`,
				data: {
					title: d.title,
					side: d.side,
					size: d.size,
					shortcut: d.shortcut,
				},
			});
		}
	}
}

/** Walk the renderable looking for drawer-rune tags. Visits each drawer's
 *  shell exactly once (we don't recurse into a drawer's body, drawer-in-drawer
 *  is out of scope). */
function walkForDrawers(
	node: unknown,
	visit: (drawerTag: InstanceType<typeof Tag>) => void,
): void {
	if (Array.isArray(node)) {
		for (const c of node) walkForDrawers(c, visit);
		return;
	}
	if (!Tag.isTag(node as never)) return;
	const tag = node as InstanceType<typeof Tag>;
	if ((tag.attributes as Record<string, unknown> | undefined)?.['data-rune'] === 'drawer') {
		visit(tag);
		// Don't recurse — drawer-in-drawer isn't supported and skipping the
		// body avoids treating a future inner-drawer descendant as a sibling
		// of the outer one.
		return;
	}
	if (!tag.children) return;
	for (const c of tag.children) walkForDrawers(c, visit);
}

/** Pull the drawer's title text out of its header → title element. Returns
 *  `undefined` when the drawer has no title (the rune renders headerless
 *  in that case). String concatenation of leaf text nodes is good enough —
 *  drawer titles are short. */
function extractTitleText(drawerTag: InstanceType<typeof Tag>): string | undefined {
	const titleTag = findByDataName(drawerTag, 'title');
	if (!titleTag) return undefined;
	const text = collectText(titleTag);
	return text.length > 0 ? text : undefined;
}

function findByDataName(
	root: InstanceType<typeof Tag>,
	name: string,
): InstanceType<typeof Tag> | undefined {
	if ((root.attributes as Record<string, unknown> | undefined)?.['data-name'] === name) {
		return root;
	}
	for (const c of root.children ?? []) {
		if (Tag.isTag(c as never)) {
			const hit = findByDataName(c as InstanceType<typeof Tag>, name);
			if (hit) return hit;
		}
	}
	return undefined;
}

function collectText(node: unknown): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(collectText).join('');
	if (Tag.isTag(node as never)) {
		const tag = node as InstanceType<typeof Tag>;
		return (tag.children ?? []).map(collectText).join('');
	}
	return '';
}

/**
 * postProcess walk: rewrite each `data-drawer-title-auto` heading to the
 * level computed from the outline depth at that position on the page.
 * Returns the same renderable identity when no drawer titles needed
 * rewriting, so downstream postProcess steps can skip a no-op pass.
 */
export function resolveAutoDrawerTitleLevels(renderable: unknown): unknown {
	const state = { lastHeadingLevel: 0, mutated: false };
	const next = walkAndRewriteTitles(renderable, state);
	return state.mutated ? next : renderable;
}

function walkAndRewriteTitles(
	node: unknown,
	state: { lastHeadingLevel: number; mutated: boolean },
): unknown {
	if (typeof node === 'string' || typeof node === 'number' || node == null) return node;
	if (Array.isArray(node)) {
		let mutated = false;
		const next = node.map((c) => {
			const w = walkAndRewriteTitles(c, state);
			if (w !== c) mutated = true;
			return w;
		});
		return mutated ? next : node;
	}
	if (!Tag.isTag(node as never)) return node;
	const tag = node as InstanceType<typeof Tag>;

	const headingMatch = HEADING_TAG_RE.exec(tag.name);
	// Auto-title placeholder: rewrite this node's tag name based on the
	// last heading level we saw. Default to h2 when no heading has been
	// encountered yet (the page-title h1 lives in layout, so the next
	// reasonable level inside the body is h2).
	const isAutoTitle = (tag.attributes as Record<string, unknown> | undefined)?.[DRAWER_TITLE_AUTO_MARKER] === 'true';
	if (isAutoTitle) {
		const base = state.lastHeadingLevel === 0 ? 1 : state.lastHeadingLevel;
		const targetLevel = Math.min(6, Math.max(1, base + 1));
		state.mutated = true;
		const newAttrs: Record<string, unknown> = { ...(tag.attributes as Record<string, unknown>) };
		delete newAttrs[DRAWER_TITLE_AUTO_MARKER];
		return new Tag(`h${targetLevel}`, newAttrs, tag.children);
	}

	if (headingMatch) {
		state.lastHeadingLevel = Number(headingMatch[1]);
	}

	if (!tag.children || tag.children.length === 0) return tag;

	let mutated = false;
	const newChildren = tag.children.map((c) => {
		const w = walkAndRewriteTitles(c, state);
		if (w !== c) mutated = true;
		return w;
	});
	if (!mutated) return tag;
	return new Tag(tag.name, tag.attributes, newChildren as never[]);
}
