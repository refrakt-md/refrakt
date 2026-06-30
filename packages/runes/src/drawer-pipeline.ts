/**
 * Drawer pipeline hooks (SPEC-060, WORK-257; preview hoist SPEC-078, WORK-300).
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
 *
 * - **postProcess (hoist)** turns inline `preview="drawer"` references
 *   into hoisted drawer sections at the page root. Reference runes
 *   (file-ref, xref) emit a `<meta data-field="hoist-drawer">` sentinel
 *   next to their inline `<a>` link; the hoist pass collects these,
 *   dedups by target id, detects collisions with author-declared
 *   drawers (author wins, hoist defers), and appends a `<section
 *   class="rf-drawer">` per unique reference to the end of the page
 *   renderable. The drawer's body and footer content is built by a
 *   source-specific builder that the consuming rune registers via
 *   `registerHoistBuilder` at module load time, so this file knows
 *   nothing about file paths, entity ids, or rune-specific rendering.
 */

import Markdoc from '@markdoc/markdoc';
import { readField } from '@refrakt-md/transform';
import type { EntityRegistry, PipelineContext, TransformedPage, ProjectFiles } from '@refrakt-md/types';
import { DRAWER_TITLE_AUTO_MARKER } from './tags/drawer.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

const HEADING_TAG_RE = /^h([1-6])$/;

/** Read a `data-*` attribute from a tag, treating undefined as undefined. */
function readDataAttr(tag: InstanceType<typeof Tag>, key: string): string | undefined {
	const v = (tag.attributes as Record<string, unknown> | undefined)?.[key];
	return typeof v === 'string' ? v : undefined;
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
				// SPEC-082 (WORK-331): read field values from the data-rune-fields
				// bag (bag-first, meta-fallback) — the schema no longer emits
				// <meta data-field> children.
				side: readField(tag as never, 'side') ?? 'right',
				size: readField(tag as never, 'size') ?? 'md',
				shortcut: readField(tag as never, 'shortcut'),
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

// ─────────────────────────────────────────────────────────────────────
// Hoist preview drawers (SPEC-078, WORK-300)
// ─────────────────────────────────────────────────────────────────────

/** Sentinel `data-field` value emitted by reference runes on the meta tag
 *  that carries the drawer payload. The hoist pass collects these and
 *  removes them from the rendered tree. */
export const HOIST_DRAWER_SENTINEL = 'hoist-drawer';

/** Per-page context handed to source-specific hoist builders so they can
 *  read the entity registry (for xref), read source files through the
 *  project's `ProjectFiles` provider (for file-ref), or emit pipeline
 *  messages. */
export interface HoistBuildContext {
	pageUrl: string;
	registry: Readonly<EntityRegistry> | undefined;
	/** The project's files (SPEC-113) — file-ref reads its preview source
	 *  through this provider. Undefined when no provider is wired. */
	projectFiles: ProjectFiles | undefined;
	ctx: PipelineContext;
}

/** Builder for a single hoist source (`file-ref`, `xref`, …). Reads
 *  the sentinel's `data-*` attributes (payload) and returns a complete
 *  hoisted drawer subtree — a `<section class="rf-drawer">` ready to be
 *  appended to the page root. Returning `null` skips the hoist (used
 *  when the source can't render anything meaningful, e.g. xref with an
 *  unresolvable entity id). */
export type HoistBuilder = (
	payload: Record<string, string>,
	context: HoistBuildContext,
) => TagNode | null;

const hoistBuilders = new Map<string, HoistBuilder>();

/** Register a hoist builder for a given `source` value. Called by
 *  reference runes at module load (e.g. `file-ref.ts` calls
 *  `registerHoistBuilder('file-ref', …)`). Re-registration overwrites,
 *  which lets tests stub out a builder per case. */
export function registerHoistBuilder(source: string, builder: HoistBuilder): void {
	hoistBuilders.set(source, builder);
}

/** Get the registered builder for a `source`, or undefined when none is
 *  registered. Exposed for diagnostics / tests. */
export function getHoistBuilder(source: string): HoistBuilder | undefined {
	return hoistBuilders.get(source);
}

/** Internal: read every `data-*` attribute off a sentinel meta tag into
 *  a plain string-string record. Non-string attribute values are
 *  ignored. */
function readPayload(meta: TagNode): Record<string, string> {
	const out: Record<string, string> = {};
	const attrs = meta.attributes as Record<string, unknown> | undefined;
	if (!attrs) return out;
	for (const [k, v] of Object.entries(attrs)) {
		if (!k.startsWith('data-')) continue;
		if (typeof v === 'string') out[k.slice('data-'.length)] = v;
	}
	return out;
}

/**
 * Walk a page's renderable, collect every `<meta data-field="hoist-drawer">`
 * sentinel, dedup by `data-target-id`, build a hoisted `<section>` per
 * unique target via the registered source builder, and return a new
 * renderable with the sentinels stripped and the hoisted drawers
 * appended at the page root.
 *
 * Rules:
 * - **Dedup**: N mentions of the same target id collapse to one drawer.
 * - **Collision with author-declared drawer**: if the page already
 *   declares `{% drawer id="X" %}` block-level and a hoist would emit
 *   the same id, the author drawer wins — the hoist defers, no new
 *   `<section>` is emitted, and an info-level pipeline message names
 *   both sources.
 * - **Nested preview**: a hoist sentinel inside another drawer's body
 *   still hoists (we don't block it), but emits an info-level note so
 *   authors can spot it in CI output.
 */
export function hoistPreviewDrawers(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry> | undefined,
	projectFiles: ProjectFiles | undefined,
	ctx: PipelineContext,
): unknown {
	// First pass: collect author-declared drawer ids so collisions can
	// be detected before any hoist work runs.
	const authorIds = collectAuthorDrawerIds(renderable);

	// Second pass: walk the tree, strip hoist sentinels, collect their
	// payloads (deduped, collision-checked, nesting-checked).
	const payloads = new Map<string, Record<string, string>>();
	const seenIds = new Set<string>();
	const state: WalkState = {
		payloads,
		seenIds,
		authorIds,
		drawerDepth: 0,
		pageUrl,
		ctx,
		mutated: false,
	};
	const stripped = walkStripSentinels(renderable, state);

	if (payloads.size === 0) return state.mutated ? stripped : renderable;

	// Third pass: build hoisted drawer sections via source-specific
	// builders and append to the page renderable root.
	const buildContext: HoistBuildContext = { pageUrl, registry, projectFiles, ctx };
	const drawers: TagNode[] = [];
	for (const payload of payloads.values()) {
		const source = payload.source;
		if (!source) {
			ctx.warn(
				`hoist drawer payload is missing required \`source\` attribute (target-id=${payload['target-id'] ?? '?'})`,
				pageUrl,
			);
			continue;
		}
		const builder = hoistBuilders.get(source);
		if (!builder) {
			ctx.warn(
				`hoist drawer source "${source}" has no registered builder — skipping target-id=${payload['target-id'] ?? '?'}`,
				pageUrl,
			);
			continue;
		}
		const node = builder(payload, buildContext);
		if (node) drawers.push(node);
	}

	if (drawers.length === 0) return stripped;

	if (Array.isArray(stripped)) return [...stripped, ...drawers];
	if (Tag.isTag(stripped as never)) {
		const t = stripped as TagNode;
		return new Tag(t.name, t.attributes, [...(t.children ?? []), ...drawers] as never[]);
	}
	return [stripped, ...drawers];
}

function collectAuthorDrawerIds(renderable: unknown): Set<string> {
	const ids = new Set<string>();
	const walk = (node: unknown): void => {
		if (Array.isArray(node)) { for (const c of node) walk(c); return; }
		if (!Tag.isTag(node as never)) return;
		const tag = node as TagNode;
		if ((tag.attributes as Record<string, unknown> | undefined)?.['data-rune'] === 'drawer') {
			const id = (tag.attributes as Record<string, unknown> | undefined)?.['data-drawer-id'];
			if (typeof id === 'string') ids.add(id);
			return; // don't recurse into a drawer's body — drawer-in-drawer is its own concern
		}
		for (const c of tag.children ?? []) walk(c);
	};
	walk(renderable);
	return ids;
}

interface WalkState {
	payloads: Map<string, Record<string, string>>;
	seenIds: Set<string>;
	authorIds: Set<string>;
	drawerDepth: number;
	pageUrl: string;
	ctx: PipelineContext;
	mutated: boolean;
}

function walkStripSentinels(node: unknown, state: WalkState): unknown {
	if (Array.isArray(node)) {
		let mutated = false;
		const out: unknown[] = [];
		for (const c of node) {
			const w = walkStripSentinels(c, state);
			if (w !== c) mutated = true;
			if (w !== STRIP) out.push(w);
		}
		if (!mutated) return node;
		state.mutated = true;
		return out;
	}
	if (!Tag.isTag(node as never)) return node;
	const tag = node as TagNode;

	// Strip the sentinel meta itself.
	if (tag.name === 'meta'
		&& (tag.attributes as Record<string, unknown> | undefined)?.['data-field'] === HOIST_DRAWER_SENTINEL
	) {
		const payload = readPayload(tag);
		const targetId = payload['target-id'];
		if (!targetId) {
			state.ctx.warn(
				`hoist drawer sentinel is missing required \`data-target-id\` attribute`,
				state.pageUrl,
			);
			return STRIP;
		}
		// Collision with author-declared drawer? Author wins; hoist defers.
		if (state.authorIds.has(targetId)) {
			state.ctx.info(
				`Hoist preview "${targetId}" (source=${payload.source ?? '?'}) collides with an author-declared {% drawer id="${targetId}" %} on this page — author drawer wins, hoist defers.`,
				state.pageUrl,
			);
			return STRIP;
		}
		// Nested preview inside another drawer's body? Still hoist, but
		// flag it — dialog stacking handles it but the shape is awkward.
		if (state.drawerDepth > 0) {
			state.ctx.info(
				`Hoist preview "${targetId}" (source=${payload.source ?? '?'}) appears inside another drawer's body — nested previews stack on modern browsers, consider not nesting.`,
				state.pageUrl,
			);
		}
		// Dedup: keep the first occurrence's payload.
		if (!state.seenIds.has(targetId)) {
			state.payloads.set(targetId, payload);
			state.seenIds.add(targetId);
		}
		return STRIP;
	}

	const isDrawer = (tag.attributes as Record<string, unknown> | undefined)?.['data-rune'] === 'drawer';
	if (isDrawer) state.drawerDepth++;

	if (!tag.children || tag.children.length === 0) {
		if (isDrawer) state.drawerDepth--;
		return tag;
	}

	let mutated = false;
	const newChildren: unknown[] = [];
	for (const c of tag.children) {
		const w = walkStripSentinels(c, state);
		if (w !== c) mutated = true;
		if (w !== STRIP) newChildren.push(w);
	}
	if (isDrawer) state.drawerDepth--;
	if (!mutated) return tag;
	state.mutated = true;
	return new Tag(tag.name, tag.attributes, newChildren as never[]);
}

/** Sentinel value returned by `walkStripSentinels` for elements that
 *  should be removed from their position in the tree. Using a symbol
 *  lets the array-walk path tell "removed" apart from "replaced with
 *  another node". */
const STRIP = Symbol('hoist-strip');

// ─────────────────────────────────────────────────────────────────────
// Slug derivation helpers — used by reference runes when emitting
// sentinels and re-derived here so tests can lock the shape.
// ─────────────────────────────────────────────────────────────────────

/** Derive a drawer slug for a `file-ref` target. Encodes both path and
 *  lines so different ranges of the same path produce distinct ids.
 *
 *  Examples:
 *  - `pathToSlug('packages/types/src/token-contract.ts')` → `'packages-types-src-token-contract-ts'`
 *  - `pathToSlug('packages/types/src/token-contract.ts', '42-58')` → `'packages-types-src-token-contract-ts-L42-L58'`
 *  - `pathToSlug('docs/My File.md', '12')` → `'docs-my-file-md-L12'` */
export function pathToSlug(path: string, lines?: string): string {
	const base = path
		.toLowerCase()
		// keep [a-z0-9._-]; turn everything else (including `/`, ` `, parens) into `-`.
		.replace(/[^a-z0-9.]+/g, '-')
		// collapse repeated dashes and trim ends.
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	if (!lines) return base;
	const trimmed = lines.trim();
	const dash = trimmed.indexOf('-');
	if (dash < 0) return `${base}-L${trimmed}`;
	const start = trimmed.slice(0, dash).trim();
	const end = trimmed.slice(dash + 1).trim();
	return end ? `${base}-L${start}-L${end}` : `${base}-L${start}`;
}
