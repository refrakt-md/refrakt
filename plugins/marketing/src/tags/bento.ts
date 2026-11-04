import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	RenderableNodeCursor,
	asNodes,
	stretchedLink,
	unwrapParagraphImages,
} from '@refrakt-md/runes';

const CELL_TITLE_LEVEL = 3;

function splitZones(nodes: Node[]): Node[][] {
	const zones: Node[][] = [[]];
	for (const n of nodes) {
		if (n.type === 'hr') zones.push([]);
		else zones[zones.length - 1].push(n);
	}
	return zones;
}

function zoneRoles(zones: Node[][]): { media: Node[]; body: Node[]; footer: Node[] } {
	if (zones.length === 1) return { media: [], body: zones[0], footer: [] };
	if (zones.length === 2) return { media: zones[0], body: zones[1], footer: [] };
	return { media: zones[0], footer: zones[zones.length - 1], body: zones.slice(1, -1).flat() };
}

export const bentoCellSections = { media: 'media', title: 'title', body: 'body' } as const;

export const bentoCell = createContentModelSchema({
	sections: bentoCellSections,
	provides: ['prose'],
	attributes: {
		size: { type: String, required: false },
		cols: { type: Number, required: false },
		rows: { type: Number, required: false },
		'media-position': {
			type: String,
			required: false,
			matches: ['top', 'bottom', 'start', 'end', 'cover'],
		},
		'content-height': {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'xl'],
			description:
				'Override the grid content-height for this cell (column cells): pin its text area to sm/md/lg/xl',
		},
		'media-ratio': {
			type: String,
			required: false,
			matches: ['1/3', '2/5', '1/2', '3/5', '2/3'],
			description:
				"Override the grid media-ratio for this cell (beside cells): the media zone's share of the cell width",
		},
		href: { type: String, required: false },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const all = asNodes(resolved.body);

		let titleNode: Node | undefined;
		let rest = all;
		if (all[0]?.type === 'heading') {
			titleNode = all[0];
			titleNode.attributes = { ...titleNode.attributes, level: CELL_TITLE_LEVEL };
			rest = all.slice(1);
		}

		const { media, body, footer } = zoneRoles(splitZones(rest));

		const children: RenderableTreeNode[] = [];
		const refs: Record<string, any> = {};
		const properties: Record<string, any> = {};

		const size = attrs.size ?? 'medium';
		const sizeMeta = new Tag('meta', { content: size });
		properties.size = sizeMeta;

		const fallback = presetSpans(size, 6);
		const cols = attrs.cols ? String(attrs.cols) : String(fallback.cols);
		const rows = attrs.rows ? String(attrs.rows) : String(fallback.rows);
		const colsMeta = new Tag('meta', { content: cols });
		const rowsMeta = new Tag('meta', { content: rows });
		properties.cols = colsMeta;
		properties.rows = rowsMeta;

		const contentHeightMeta = new Tag('meta', {
			content: (attrs['content-height'] as string) ?? '',
		});
		const mediaRatioMeta = new Tag('meta', { content: (attrs['media-ratio'] as string) ?? '' });
		properties['content-height'] = contentHeightMeta;
		properties['media-ratio'] = mediaRatioMeta;

		if (media.length > 0) {
			const mediaInner = unwrapParagraphImages(
				new RenderableNodeCursor(
					Markdoc.transform(media, config) as RenderableTreeNode[],
				).toArray() as RenderableTreeNode[],
			);
			const mediaDiv = new Tag(
				'div',
				{ 'data-section': 'media', 'data-name': 'media' },
				mediaInner,
			);
			refs.media = mediaDiv;
			children.push(mediaDiv);
		}

		let titleTag: InstanceType<typeof Tag> | undefined;
		if (titleNode) {
			const t = new RenderableNodeCursor(
				Markdoc.transform([titleNode], config) as RenderableTreeNode[],
			).toArray()[0];
			if (Markdoc.Tag.isTag(t)) {
				titleTag = t;
			}
		}
		const bodyInner = unwrapParagraphImages(
			new RenderableNodeCursor(
				Markdoc.transform(body, config) as RenderableTreeNode[],
			).toArray() as RenderableTreeNode[],
		);
		const bodyDiv = new Tag('div', { 'data-name': 'body' }, bodyInner);

		let footerTag: InstanceType<typeof Tag> | undefined;
		if (footer.length > 0) {
			const footerInner = new RenderableNodeCursor(
				Markdoc.transform(footer, config) as RenderableTreeNode[],
			).toArray() as RenderableTreeNode[];
			footerTag = new Tag('footer', { 'data-name': 'footer' }, footerInner);
		}

		if (titleTag) {
			refs.title = titleTag;
			children.push(titleTag);
		}
		refs.body = bodyDiv;
		children.push(bodyDiv);
		if (footerTag) {
			refs.footer = footerTag;
			children.push(footerTag);
		}

		const href = String(attrs.href ?? '');
		let linkTag: InstanceType<typeof Tag> | undefined;
		if (href) {
			linkTag = stretchedLink(href);
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
		const defaultPosition = size === 'large' || size === 'full' ? 'start' : 'top';
		(node as any).attributes = {
			...(node as any).attributes,
			'data-media-position': attrs['media-position'] ?? defaultPosition,
		};
		return node;
	},
});

function tieredSize(level: number): string {
	if (level === 1) return 'full';
	if (level === 2) return 'large';
	if (level === 3) return 'medium';
	return 'small';
}

function presetSpans(size: string, columns: number): { cols: number; rows: number } {
	const clamp = (n: number) => Math.max(1, Math.min(columns, Math.round(n)));
	switch (size) {
		case 'full':
			return { cols: columns, rows: 1 };
		case 'large':
			return { cols: clamp((columns * 2) / 3), rows: 2 };
		case 'medium':
			return { cols: clamp(columns / 2), rows: 1 };
		case 'small':
		default:
			return { cols: clamp(columns / 3), rows: 1 };
	}
}

function parseLevels(spec: string): { cols: number; rows: number }[] {
	const rungs: { cols: number; rows: number }[] = [];
	for (const raw of spec.split(',')) {
		const entry = raw.trim();
		if (!entry) continue;
		const m = entry.match(/^(\d+)(?:x(\d+))?$/i);
		if (!m) {
			console.warn(
				`[bento] Ignoring malformed levels rung "${entry}" — expected a column count like "4" or a footprint like "4x2".`,
			);
			continue;
		}
		rungs.push({ cols: parseInt(m[1], 10), rows: m[2] ? parseInt(m[2], 10) : 1 });
	}
	return rungs;
}

function convertHeadings(
	nodes: Node[],
	columns: number,
	ladder: { cols: number; rows: number }[] | null,
	gridPos?: string,
	gridFrame?: Record<string, string>,
): Node[] {
	const preamble: Node[] = [];
	const cells: Node[] = [];

	let currentHeading: Node | null = null;
	let currentChildren: Node[] = [];
	let seenFirstCellHeading = false;

	const flush = () => {
		if (!currentHeading) return;
		const level = (currentHeading.attributes?.level as number) ?? 2;
		const cellChildren = [currentHeading, ...currentChildren];
		const posAttr = { ...(gridPos ? { 'media-position': gridPos } : {}), ...(gridFrame ?? {}) };
		if (ladder && ladder.length > 0) {
			const rungIndex = Math.max(0, level - 1);
			const { cols, rows } = ladder[Math.min(rungIndex, ladder.length - 1)];
			cells.push(
				new Ast.Node('tag', { size: '', cols, rows, ...posAttr }, cellChildren, 'bento-cell'),
			);
		} else {
			const size = tieredSize(level);
			const { cols, rows } = presetSpans(size, columns);
			cells.push(new Ast.Node('tag', { size, cols, rows, ...posAttr }, cellChildren, 'bento-cell'));
		}
	};

	for (const node of nodes) {
		if (node.type === 'heading') {
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
		gap: {
			type: String,
			required: false,
			description: 'Space between grid cells (CSS length value)',
		},
		columns: {
			type: Number,
			required: false,
			description: 'Number of columns in the bento grid (default 6)',
		},
		levels: {
			type: String,
			required: false,
			description:
				'Heading-sugar footprint ladder, indexed by absolute heading level (rung 0 = h1, rung 1 = h2, …): comma-separated rungs, each a column count "W" (× 1 row) or a footprint "WxH" (e.g. "6,5,4,3,2,1" or "4x2,3x1,2x1"). Depths beyond the last rung clamp to it. Omit for tiered sizing. Ignored for explicit-cell grids.',
		},
		'row-height': {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'xl'],
			description: 'Uniform grid row track height: sm, md (default), lg, or xl',
		},
		'content-height': {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'xl'],
			description:
				"Grid default: pin each column cell's text area to a fixed height (sm/md/lg/xl) so cells align vertically; per-cell overridable; reverts to natural height on mobile",
		},
		'media-ratio': {
			type: String,
			required: false,
			matches: ['1/3', '2/5', '1/2', '3/5', '2/3'],
			description:
				"Grid default for beside (start/end) cells: the media zone's share of the cell width; per-cell overridable",
		},
		'media-position': {
			type: String,
			required: false,
			matches: ['top', 'bottom', 'start', 'end', 'cover'],
			description:
				"Grid default media placement for every cell (overrides the per-cell size-derived default); a cell's own media-position still wins",
		},
		collapse: {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'never'],
			description:
				'Binary collapse breakpoint: above it the grid renders as authored, below it cells stack into a single column with auto row tracks. Default sm (640px). `never` to disable.',
		},
	},
	contentModel: (attrs) => ({
		type: 'custom' as const,
		processChildren: (nodes: unknown[]) => {
			const ns = nodes as Node[];
			const gridPos = attrs['media-position'] as string | undefined;
			const GRID_CASCADE = [
				'frame',
				'frame-aspect',
				'frame-displace',
				'frame-offset',
				'frame-oversize',
				'frame-place',
				'frame-anchor',
				'frame-shadow',
				'elevation',
			];
			const gridFrame: Record<string, string> = {};
			for (const k of GRID_CASCADE) {
				const v = attrs[k];
				if (v != null && v !== '') gridFrame[k] = String(v);
			}
			const stripGridFrame = () => {
				for (const k of GRID_CASCADE) delete (attrs as Record<string, unknown>)[k];
			};
			const hasExplicit = ns.some((n) => n.type === 'tag' && (n as any).tag === 'bento-cell');
			if (hasExplicit) {
				const cells = ns.filter((n) => n.type === 'tag' && (n as any).tag === 'bento-cell');
				for (const cell of cells) {
					if (gridPos && cell.attributes?.['media-position'] === undefined) {
						cell.attributes = { ...cell.attributes, 'media-position': gridPos };
					}
					for (const [k, v] of Object.entries(gridFrame)) {
						if (cell.attributes?.[k] === undefined)
							cell.attributes = { ...cell.attributes, [k]: v };
					}
				}
				stripGridFrame();
				return cells;
			}
			const ladder = attrs.levels ? parseLevels(attrs.levels as string) : null;
			const cells = convertHeadings(ns, (attrs.columns as number) ?? 6, ladder, gridPos, gridFrame);
			stripGridFrame();
			return cells;
		},
		description:
			'A grid of cells. Heading sugar (each heading → a cell, tile size from depth) OR explicit {% bento-cell %} cells (full control). A grid primitive — no page-section preamble.',
	}),
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

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
		const rowHeightMeta = new Tag('meta', { content: (attrs['row-height'] as string) ?? '' });
		const contentHeightMeta = new Tag('meta', {
			content: (attrs['content-height'] as string) ?? '',
		});
		const mediaRatioMeta = new Tag('meta', { content: (attrs['media-ratio'] as string) ?? '' });
		const collapseMeta = new Tag('meta', { content: (attrs.collapse as string) ?? '' });

		const cells = cellStream.tag('div').typeof('BentoCell');
		const grid = cells.wrap('div');

		const children: RenderableTreeNode[] = [];
		if (lead.count() > 0) children.push(...(lead.toArray() as RenderableTreeNode[]));
		children.push(grid.next());

		return createComponentRenderable({
			rune: 'bento',
			tag: 'section',
			properties: {
				gap: gapMeta,
				columns: columnsMeta,
				'row-height': rowHeightMeta,
				'content-height': contentHeightMeta,
				'media-ratio': mediaRatioMeta,
				collapse: collapseMeta,
				cell: cells,
			},
			refs: { grid },
			children,
		});
	},
});
