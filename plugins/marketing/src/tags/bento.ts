import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, RenderableNodeCursor, asNodes } from '@refrakt-md/runes';

/** Uniform outline level for every cell title — cells are siblings in the grid,
 *  so their titles share one heading level (and one visual size), regardless of
 *  the input heading level (which only drives tile size). */
const CELL_TITLE_LEVEL = 3;

/** Split a node list on top-level `hr` (`---`) into zones. */
function splitZones(nodes: Node[]): Node[][] {
	const zones: Node[][] = [[]];
	for (const n of nodes) {
		if (n.type === 'hr') zones.push([]);
		else zones[zones.length - 1].push(n);
	}
	return zones;
}

/** Map hr-delimited zones to media / body / footer by count, mirroring `card`:
 *  1 → body; 2 → media + body; 3+ → media + body… + footer. */
function zoneRoles(zones: Node[][]): { media: Node[]; body: Node[]; footer: Node[] } {
	if (zones.length === 1) return { media: [], body: zones[0], footer: [] };
	if (zones.length === 2) return { media: zones[0], body: zones[1], footer: [] };
	return { media: zones[0], footer: zones[zones.length - 1], body: zones.slice(1, -1).flat() };
}

export const bentoCell = createContentModelSchema({
	attributes: {
		size: { type: String, required: false },
		cols: { type: Number, required: false },
		rows: { type: Number, required: false },
		'media-position': { type: String, required: false, matches: ['top', 'bottom', 'start', 'end'] },
		href: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const all = asNodes(resolved.body);

		// The leading heading (the cell's generating heading, or an author-written
		// one) is the title — rendered at a uniform level, not the input level.
		let titleNode: Node | undefined;
		let rest = all;
		if (all[0]?.type === 'heading') {
			titleNode = all[0];
			titleNode.attributes = { ...titleNode.attributes, level: CELL_TITLE_LEVEL };
			rest = all.slice(1);
		}

		// The remainder splits on `---` into media / body / footer, like card.
		const { media, body, footer } = zoneRoles(splitZones(rest));

		const children: RenderableTreeNode[] = [];
		const refs: Record<string, any> = {};
		const properties: Record<string, any> = {};

		// size (preset name → data-size) + the resolved grid spans. Explicit
		// `cols`/`rows` (e.g. from an author or a non-default grid) override the
		// preset; otherwise fall back to the medium preset spans.
		const size = attrs.size ?? 'medium';
		const sizeMeta = new Tag('meta', { content: size });
		properties.size = sizeMeta;
		children.push(sizeMeta);

		const fallback = presetSpans(size, 6);
		const cols = attrs.cols ? String(attrs.cols) : String(fallback.cols);
		const rows = attrs.rows ? String(attrs.rows) : String(fallback.rows);
		const colsMeta = new Tag('meta', { content: cols });
		const rowsMeta = new Tag('meta', { content: rows });
		properties.cols = colsMeta;
		properties.rows = rowsMeta;
		children.push(colsMeta, rowsMeta);

		// Media zone — clipped/sized by the shared media-zone selector (WORK-339);
		// no bento-specific per-guest CSS.
		if (media.length > 0) {
			const mediaInner = new RenderableNodeCursor(
				Markdoc.transform(media, config) as RenderableTreeNode[],
			).toArray() as RenderableTreeNode[];
			const mediaDiv = new Tag('div', { 'data-section': 'media', 'data-name': 'media' }, mediaInner);
			refs.media = mediaDiv;
			children.push(mediaDiv);
		}

		// Content zone — title + body (+ footer). One wrapper so the layout can
		// place media beside / above it (WORK-348).
		const contentInner: RenderableTreeNode[] = [];
		let titleTag: InstanceType<typeof Tag> | undefined;
		if (titleNode) {
			const t = new RenderableNodeCursor(
				Markdoc.transform([titleNode], config) as RenderableTreeNode[],
			).toArray()[0];
			if (Markdoc.Tag.isTag(t)) { titleTag = t; contentInner.push(t); }
		}
		const bodyInner = new RenderableNodeCursor(
			Markdoc.transform(body, config) as RenderableTreeNode[],
		).toArray() as RenderableTreeNode[];
		const bodyDiv = new Tag('div', { 'data-name': 'body' }, bodyInner);
		contentInner.push(bodyDiv);

		let footerTag: InstanceType<typeof Tag> | undefined;
		if (footer.length > 0) {
			const footerInner = new RenderableNodeCursor(
				Markdoc.transform(footer, config) as RenderableTreeNode[],
			).toArray() as RenderableTreeNode[];
			footerTag = new Tag('footer', { 'data-name': 'footer' }, footerInner);
			contentInner.push(footerTag);
		}

		const contentDiv = new Tag('div', { 'data-name': 'content' }, contentInner);
		refs.content = contentDiv;
		if (titleTag) refs.title = titleTag;
		refs.body = bodyDiv;
		if (footerTag) refs.footer = footerTag;
		children.push(contentDiv);

		// Whole-cell link (stretched overlay; nested links stay clickable).
		const href = String(attrs.href ?? '');
		let linkTag: InstanceType<typeof Tag> | undefined;
		if (href) {
			linkTag = new Tag('a', { 'data-name': 'link', href, 'aria-hidden': 'true', tabindex: '-1' }, []);
			refs.link = linkTag;
			children.push(linkTag);
		}

		const node = createComponentRenderable({
			rune: 'bento-cell',
			tag: 'div',
			properties,
			refs,
			children,
		});
		// Author-controlled media placement, with a size-derived default: large/
		// full cells place media beside the body; smaller cells stack it on top.
		const defaultPosition = (size === 'large' || size === 'full') ? 'start' : 'top';
		(node as any).attributes = { ...(node as any).attributes, 'data-media-position': attrs['media-position'] ?? defaultPosition };
		return node;
	},
});

function tieredSize(headingLevel: number, level: number): string {
	const diff = level - headingLevel;
	if (diff === 0) return 'large';
	if (diff === 1) return 'medium';
	return 'small';
}

/** Resolve a size preset to (cols, rows) spans, **proportional to the column
 *  count** so a preset holds its ratio at any `columns` (small ⅓, medium ½,
 *  large ⅔ × 2 rows, full = all → 2/3/4/6 @ 6 cols). */
function presetSpans(size: string, columns: number): { cols: number; rows: number } {
	const clamp = (n: number) => Math.max(1, Math.min(columns, Math.round(n)));
	switch (size) {
		case 'full': return { cols: columns, rows: 1 };
		case 'large': return { cols: clamp((columns * 2) / 3), rows: 2 };
		case 'medium': return { cols: clamp(columns / 2), rows: 1 };
		case 'small':
		default: return { cols: clamp(columns / 3), rows: 1 };
	}
}

/** Convert headings into bento-cell tags. The heading *level* sets tile size
 *  (tiered → a size preset → proportional `cols`/`rows`); the heading itself
 *  becomes the cell title. Content before the first heading is returned as-is —
 *  bento is a grid primitive, not a page-section, so there is no preamble. */
function convertHeadings(nodes: Node[], baseLevel: number, columns: number): Node[] {
	const preamble: Node[] = [];
	const cells: Node[] = [];
	let currentHeading: Node | null = null;
	let currentChildren: Node[] = [];
	let seenFirstCellHeading = false;

	const flush = () => {
		if (currentHeading) {
			const level = currentHeading.attributes?.level ?? baseLevel;
			const size = tieredSize(baseLevel, level);
			const { cols, rows } = presetSpans(size, columns);
			const cellChildren = [currentHeading, ...currentChildren];
			cells.push(new Ast.Node('tag', { size, cols, rows }, cellChildren, 'bento-cell'));
		}
	};

	for (const node of nodes) {
		if (node.type === 'heading' && (node.attributes.level ?? baseLevel) >= baseLevel) {
			seenFirstCellHeading = true;
			flush();
			currentHeading = node;
			currentChildren = [];
		} else if (!seenFirstCellHeading) {
			preamble.push(node);
		} else {
			currentChildren.push(node);
		}
	}
	flush();

	return [...preamble, ...cells];
}

export { presetSpans };

export const bento = createContentModelSchema({
	attributes: {
		gap: { type: String, required: false, description: 'Space between grid cells (CSS length value)' },
		columns: { type: Number, required: false, description: 'Number of columns in the bento grid (default 6)' },
		collapse: { type: String, required: false, matches: ['sm', 'md', 'lg', 'never'], description: 'Breakpoint at which the grid drops to a single stacked column' },
	},
	contentModel: (attrs) => ({
		type: 'custom' as const,
		processChildren: (nodes: unknown[]) => {
			const ns = nodes as Node[];
			// Two front doors (no mixing): if the grid contains explicit
			// `{% bento-cell %}` tags, use them directly and short-circuit heading
			// conversion (headings/loose content are ignored — explicit wins).
			const hasExplicit = ns.some(n => n.type === 'tag' && (n as any).tag === 'bento-cell');
			if (hasExplicit) return ns.filter(n => n.type === 'tag' && (n as any).tag === 'bento-cell');
			return convertHeadings(ns, 2, (attrs.columns as number) ?? 6);
		},
		description: 'A grid of cells. Heading sugar (each heading → a cell, tile size from depth) OR explicit {% bento-cell %} cells (full control). A grid primitive — no page-section preamble.',
	}),
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Cells (bento-cell tags) vs any stray pre-grid content.
		const leadAst: Node[] = [];
		const cellAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag' && (child as any).tag === 'bento-cell') cellAst.push(child);
			else leadAst.push(child);
		}

		const lead = new RenderableNodeCursor(
			Markdoc.transform(leadAst, config) as RenderableTreeNode[],
		);
		const cellStream = new RenderableNodeCursor(
			Markdoc.transform(cellAst, config) as RenderableTreeNode[],
		);

		const columns = (attrs.columns as number) ?? 6;
		const gapMeta = new Tag('meta', { content: (attrs.gap as string) ?? '1rem' });
		const columnsMeta = new Tag('meta', { content: String(columns) });
		const collapseMeta = new Tag('meta', { content: (attrs.collapse as string) ?? '' });

		const cells = cellStream.tag('div').typeof('BentoCell');
		const grid = cells.wrap('div');

		const children: RenderableTreeNode[] = [gapMeta, columnsMeta, collapseMeta];
		if (lead.count() > 0) children.push(...lead.toArray() as RenderableTreeNode[]);
		children.push(grid.next());

		return createComponentRenderable({
			rune: 'bento',
			tag: 'section',
			properties: {
				gap: gapMeta,
				columns: columnsMeta,
				collapse: collapseMeta,
				cell: cells,
			},
			refs: { grid },
			children,
		});
	},
});
