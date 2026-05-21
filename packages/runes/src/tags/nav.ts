import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNode, Node } from '@markdoc/markdoc';
import { headingsToList } from '../util.js';
import { createContentModelSchema, asNodes } from '../lib/index.js';
import { createComponentRenderable } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** Sentinel meta property written by nav auto mode; consumed by corePipelineHooks.postProcess */
export const NAV_AUTO_SENTINEL = '__nav-auto';

/** Marker attribute placed on each NavGroup of a collapsible nav; resolved during postProcess */
export const NAV_COLLAPSED_AUTO = 'auto';

/** True for renderable nodes that count as "list" content within a nav group
 *  (lists carry the items themselves). Anything else — paragraph, blockquote,
 *  image, nested rune — is a "content block" eligible for the position-based
 *  intro / footer slot rule in a menubar group. */
function isListNode(node: RenderableTreeNode): node is Tag {
	return Markdoc.Tag.isTag(node) && (node.name === 'ul' || node.name === 'ol');
}

const navItem = createContentModelSchema({
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), {
				...config,
				nodes: {
					...config.nodes,
					text: {
						transform(node: Node) {
							return new Markdoc.Tag('span', { 'data-field': 'slug' }, [node.attributes.content]);
						},
					},
				},
			}) as RenderableTreeNode[],
		);

		const links = children.tag('a');
		const slug = children.tag('span');
		const nestedItems = children.tag('ul');
		// SPEC-054 — paragraphs that appear under a list item (CommonMark
		// indented continuation) become per-item descriptions.
		const paragraphs = children.tag('p');
		const badges = children.toArray().filter(
			n => Markdoc.Tag.isTag(n) && (n as Tag).attributes?.['data-rune'] === 'badge',
		) as Tag[];

		// Explicit links (e.g., [Label](/path)) pass through as-is — slug resolution
		// happens at postProcess time (SPEC-055). Per-item description and badge
		// detection still runs.
		const description = paragraphs.count() > 0
			? new Markdoc.Tag('p', { 'data-name': 'description' }, paragraphs.toArray().flatMap(p => p.children))
			: undefined;

		if (links.count() > 0) {
			const extraChildren: RenderableTreeNode[] = [];
			if (description) extraChildren.push(description);
			if (badges.length > 0) {
				for (const b of badges) b.attributes['data-name'] = 'badge';
				extraChildren.push(...badges);
			}
			return createComponentRenderable({
				rune: 'nav-item',
				tag: 'li',
				properties: description ? { description } : {},
				children: [...links.toArray(), ...extraChildren],
			});
		}

		const itemChildren: RenderableTreeNode[] = [];
		if (slug.count() > 0) itemChildren.push(...slug.toArray());
		if (description) itemChildren.push(description);
		if (badges.length > 0) {
			for (const b of badges) b.attributes['data-name'] = 'badge';
			itemChildren.push(...badges);
		}
		if (nestedItems.count() > 0) itemChildren.push(...nestedItems.toArray());

		return createComponentRenderable({
			rune: 'nav-item',
			tag: 'li',
			properties: {
				slug,
				...(description ? { description } : {}),
				children: nestedItems.count() > 0
					? nestedItems.flatten().tag('li')
					: undefined,
			},
			children: itemChildren,
		});
	},
});

interface ParsedGroup {
	kind: 'group';
	heading: Tag;
	children: RenderableTreeNode[];
}
interface ColumnBreak {
	kind: 'column-break';
}
type NavSequence = Array<ParsedGroup | ColumnBreak>;

/** Parse the nav's transformed children into top-level items, group sections,
 *  and column-break markers. Preserves all non-list content inside groups so
 *  the menubar slot rule and the columns flow rule can both operate on the
 *  same parse output. */
function parseNavStructure(allNodes: RenderableTreeNode[]): {
	topLevel: Tag[];
	sequence: NavSequence;
} {
	const topLevel: Tag[] = [];
	const sequence: NavSequence = [];
	let currentGroup: ParsedGroup | null = null;

	const flush = () => {
		if (currentGroup) {
			sequence.push(currentGroup);
			currentGroup = null;
		}
	};

	for (const node of allNodes) {
		// Headings open a new group section.
		if (Markdoc.Tag.isTag(node) && /^h[1-6]$/.test(node.name)) {
			flush();
			currentGroup = { kind: 'group', heading: node, children: [] };
			continue;
		}

		// <hr> between groups (at the nav top level) is a column-break marker
		// for the columns layout. Other layouts ignore it.
		if (Markdoc.Tag.isTag(node) && node.name === 'hr') {
			if (currentGroup) {
				flush();
			}
			sequence.push({ kind: 'column-break' });
			continue;
		}

		// Lists before the first heading become the top-level item row.
		if (!currentGroup) {
			if (Markdoc.Tag.isTag(node) && isListNode(node)) {
				topLevel.push(
					...node.children.filter(
						(c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li',
					),
				);
			}
			continue;
		}

		// Inside a group: keep every child in source order (list or otherwise).
		currentGroup.children.push(node);
	}

	flush();
	return { topLevel, sequence };
}

/** Classify a group's children into intro / footer / body slots per SPEC-054.
 *  First non-list content block → intro. Last non-list content block → footer.
 *  Lists + any middle non-list blocks render in source order as the body. */
function partitionGroupChildren(children: RenderableTreeNode[]): {
	intro?: RenderableTreeNode;
	body: RenderableTreeNode[];
	footer?: RenderableTreeNode;
} {
	// Find indices of non-list content blocks
	const contentIdx: number[] = [];
	children.forEach((c, i) => {
		if (Markdoc.Tag.isTag(c) && !isListNode(c)) contentIdx.push(i);
	});

	let introIdx: number | undefined;
	let footerIdx: number | undefined;
	if (contentIdx.length > 0) {
		introIdx = contentIdx[0];
		// Footer is the last non-list block IF it differs from intro AND
		// nothing prevents it from being the trailing block. We require at
		// least one body child between intro and footer for an explicit
		// footer slot — otherwise a single-content-block group reads as
		// "intro only".
		if (contentIdx.length >= 2) {
			footerIdx = contentIdx[contentIdx.length - 1];
		}
	}

	const intro = introIdx !== undefined ? children[introIdx] : undefined;
	const footer = footerIdx !== undefined ? children[footerIdx] : undefined;
	const body: RenderableTreeNode[] = [];
	children.forEach((c, i) => {
		if (i === introIdx || i === footerIdx) return;
		body.push(c);
	});

	return { intro, body, footer };
}

/** Build a NavGroup renderable from a parsed group, wrapping the intro and
 *  footer slots in `data-name`-stamped divs so the engine emits
 *  `.rf-nav-group__intro` / `.rf-nav-group__footer` classes. Everything
 *  except the heading is further wrapped in a `<div data-name="panel">`
 *  container so layouts that treat the panel as a single positioned box
 *  (menubar dropdowns, mega panels) can target one selector regardless of
 *  whether the panel contains a flat list, a nested nav, or rich slot
 *  content. */
function buildGroupTag(group: ParsedGroup): Tag<'section'> {
	const { intro, body, footer } = partitionGroupChildren(group.children);

	// Collect items property: every <li> across every list child.
	const items: Tag[] = [];
	for (const c of body) {
		if (Markdoc.Tag.isTag(c) && isListNode(c)) {
			items.push(
				...c.children.filter(
					(x): x is Tag<'li'> => Markdoc.Tag.isTag(x) && x.name === 'li',
				),
			);
		}
	}

	const panelChildren: RenderableTreeNode[] = [];
	if (intro) {
		panelChildren.push(new Markdoc.Tag('div', { 'data-name': 'intro' }, [intro]));
	}
	panelChildren.push(...body);
	if (footer) {
		panelChildren.push(new Markdoc.Tag('div', { 'data-name': 'footer' }, [footer]));
	}

	const groupChildren: RenderableTreeNode[] = [group.heading];
	if (panelChildren.length > 0) {
		groupChildren.push(new Markdoc.Tag('div', { 'data-name': 'panel' }, panelChildren));
	}

	return createComponentRenderable({
		rune: 'nav-group',
		tag: 'section',
		properties: {
			title: group.heading as Tag<'h1'>,
			item: items,
		},
		children: groupChildren,
	}) as Tag<'section'>;
}

/** Bucket a NavSequence into columns separated by column-break markers.
 *  Used by the columns layout. Empty leading / trailing buckets are dropped. */
function bucketColumns(sequence: NavSequence): ParsedGroup[][] {
	const columns: ParsedGroup[][] = [];
	let current: ParsedGroup[] = [];
	for (const entry of sequence) {
		if (entry.kind === 'column-break') {
			if (current.length > 0) columns.push(current);
			current = [];
		} else {
			current.push(entry);
		}
	}
	if (current.length > 0) columns.push(current);
	return columns;
}

export const nav = createContentModelSchema({
	attributes: {
		ordered: { type: Boolean, required: false, description: 'Use numbered list for navigation items' },
		auto: { type: Boolean, required: false, description: 'Automatically generate from child pages' },
		layout: {
			type: String,
			required: false,
			matches: ['vertical', 'menubar', 'columns', 'cards', 'strip'],
			description: 'Presentation layout: sidebar (vertical), horizontal menubar (header), column grid (footer), cards (section landing), or strip (compact secondary nav). Defaults to vertical.',
		},
		collapsible: { type: Boolean, required: false, description: 'Make each group collapsible. The group containing the current page auto-expands; others start collapsed. Only meaningful for vertical layout.' },
		defaultOpen: { type: String, required: false, description: 'Comma-separated group titles to expand by default, overriding the URL-driven auto-open behaviour.' },
	},
	contentModel: {
		type: 'custom',
		processChildren: (nodes) => headingsToList({ level: 1 })(nodes as Node[]),
		description: 'Top-level (#) headings become nav groups; the list directly under each heading becomes the group\'s items. Items are page slugs — wrap in markdown links to set custom labels, or use plain text to resolve the page title. Without headings, a single list becomes a flat nav.',
	},
	transform(resolved, attrs, config) {
		const collapsible = Boolean(attrs.collapsible);
		const sourcePath = (config as { variables?: { __sourcePath?: string } }).variables?.__sourcePath;

		const forwardLayout = (tag: Tag): Tag => {
			if (attrs.layout) tag.attributes.layout = attrs.layout;
			if (sourcePath) tag.attributes['data-source-path'] = sourcePath;
			if (attrs.auto) tag.attributes['data-auto'] = 'true';
			if (collapsible) {
				tag.attributes['data-collapsible'] = 'true';
				const existing = (tag.attributes.class as string | undefined) ?? '';
				tag.attributes.class = [existing, 'rf-nav--collapsible'].filter(Boolean).join(' ');
				if (typeof attrs.defaultOpen === 'string' && attrs.defaultOpen.trim()) {
					tag.attributes['data-default-open'] = attrs.defaultOpen.trim();
				}
			}
			return tag;
		};

		const maybeWithTrigger = (children: RenderableTreeNode[]): RenderableTreeNode[] => {
			if (attrs.layout === 'menubar') {
				const trigger = new Markdoc.Tag('button', {
					'data-name': 'trigger',
					type: 'button',
					'aria-label': 'Toggle navigation',
					'aria-expanded': 'false',
				}, []);
				return [trigger, ...children];
			}
			return children;
		};

		if (attrs.auto) {
			// Emit a placeholder with an empty nav and a sentinel meta tag.
			// The core post-process hook will replace this with resolved child page items.
			const sentinelMeta = new Markdoc.Tag('meta', { 'data-field': NAV_AUTO_SENTINEL, content: 'true' });

			return forwardLayout(createComponentRenderable({
				rune: 'nav',
				tag: 'nav',
				properties: {
					group: [],
					item: [],
				},
				children: maybeWithTrigger([sentinelMeta]),
			}));
		}

		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.children), {
				...config,
				nodes: {
					...config.nodes,
					item: navItem,
					list: {
						transform(node: Node, cfg: any) {
							return new Markdoc.Tag('ul', {}, node.transformChildren(cfg));
						},
					},
				},
			}) as RenderableTreeNode[],
		);

		// Strip layout — flat list of items, no groups, no top-level container.
		// Headings are silently rendered as plain children (the warning lives
		// downstream if needed; the schema doesn't have a ctx hook here).
		if (attrs.layout === 'strip') {
			const flatItems = children.flatten().tag('li');
			return forwardLayout(createComponentRenderable({
				rune: 'nav',
				tag: 'nav',
				class: attrs.ordered ? 'ordered' : undefined,
				properties: {
					group: [],
					item: flatItems,
				},
				children: children.toArray(),
			}));
		}

		const { topLevel, sequence } = parseNavStructure(children.toArray());
		const groups = sequence.filter((s): s is ParsedGroup => s.kind === 'group');
		const hasGroups = groups.length > 0;
		const hasColumnBreaks = sequence.some(s => s.kind === 'column-break');

		// Headingless mode: no `##` sections. If `<hr>`s are present and the
		// layout is columns, bucket the flat items at the top level into
		// columns. Otherwise fall through to the existing flat-list path.
		if (!hasGroups) {
			if (attrs.layout === 'columns' && hasColumnBreaks) {
				// Walk the original children, splitting by hr; each segment's
				// items become a column.
				const columns: Tag[][] = [];
				let buf: Tag<'li'>[] = [];
				const flushColumn = () => {
					if (buf.length > 0) {
						columns.push([new Markdoc.Tag('ul', {}, buf)]);
						buf = [];
					}
				};
				for (const node of children.toArray()) {
					if (Markdoc.Tag.isTag(node) && node.name === 'hr') {
						flushColumn();
						continue;
					}
					if (Markdoc.Tag.isTag(node) && isListNode(node)) {
						buf.push(
							...node.children.filter(
								(c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li',
							),
						);
					}
				}
				flushColumn();

				const columnTags = columns.map(
					col => new Markdoc.Tag('div', { 'data-name': 'column' }, col),
				);
				const allItems = children.flatten().tag('li');
				return forwardLayout(createComponentRenderable({
					rune: 'nav',
					tag: 'nav',
					class: attrs.ordered ? 'ordered' : undefined,
					properties: {
						group: [],
						item: allItems,
					},
					children: maybeWithTrigger(columnTags),
				}));
			}

			// Flat list (no groups, no column breaks).
			const allItems = children.flatten().tag('li');
			return forwardLayout(createComponentRenderable({
				rune: 'nav',
				tag: 'nav',
				class: attrs.ordered ? 'ordered' : undefined,
				properties: {
					group: [],
					item: allItems,
				},
				children: maybeWithTrigger(children.toArray()),
			}));
		}

		// Has groups. Build group tags with intro/footer slot detection.
		const groupTags = groups.map(buildGroupTag);

		if (collapsible) {
			for (const group of groupTags) {
				group.attributes['data-collapsed'] = NAV_COLLAPSED_AUTO;
			}
		}

		const topLevelContainer = topLevel.length > 0
			? new Markdoc.Tag('div', { 'data-name': 'top-level' }, [new Markdoc.Tag('ul', {}, topLevel)])
			: null;

		const allGroupItems = groupTags.flatMap(g => {
			// Lists now live inside the group's `<div data-name="panel">` wrapper
			// (added by buildGroupTag). Walk the group's descendants once to
			// collect every <li> regardless of nesting depth.
			const items: Tag<'li'>[] = [];
			const walk = (n: RenderableTreeNode): void => {
				if (!Markdoc.Tag.isTag(n)) return;
				if (n.name === 'li') {
					items.push(n as Tag<'li'>);
					return;
				}
				for (const c of n.children) walk(c);
			};
			for (const c of g.children) walk(c);
			return items;
		});

		// Columns layout with `<hr>`s between sections: bucket groups into columns.
		if (attrs.layout === 'columns' && hasColumnBreaks) {
			const columns = bucketColumns(sequence);
			const groupTagByRef = new Map(groups.map((g, i) => [g, groupTags[i]]));
			const columnTags = columns.map(
				col => new Markdoc.Tag(
					'div',
					{ 'data-name': 'column' },
					col.map(g => groupTagByRef.get(g)!).filter(Boolean) as RenderableTreeNode[],
				),
			);
			return forwardLayout(createComponentRenderable({
				rune: 'nav',
				tag: 'nav',
				class: attrs.ordered ? 'ordered' : undefined,
				properties: {
					group: groupTags,
					item: [...topLevel, ...allGroupItems],
				},
				children: maybeWithTrigger(
					topLevelContainer ? [topLevelContainer, ...columnTags] : columnTags,
				),
			}));
		}

		return forwardLayout(createComponentRenderable({
			rune: 'nav',
			tag: 'nav',
			class: attrs.ordered ? 'ordered' : undefined,
			properties: {
				group: groupTags,
				item: [...topLevel, ...allGroupItems],
			},
			children: maybeWithTrigger(
				topLevelContainer ? [topLevelContainer, ...groupTags] : groupTags,
			),
		}));
	},
});
