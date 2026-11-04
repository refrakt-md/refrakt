import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNode, Node } from '@markdoc/markdoc';
import { headingsToList } from '../util.js';
import { createContentModelSchema, bodyOnly, asNodes } from '../lib/index.js';
import { createComponentRenderable } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const NAV_AUTO_SENTINEL = '__nav-auto';

export const NAV_COLLAPSED_AUTO = 'auto';

function isListNode(node: RenderableTreeNode): node is Tag {
	return Markdoc.Tag.isTag(node) && (node.name === 'ul' || node.name === 'ol');
}

const navItem = createContentModelSchema({
	contentModel: bodyOnly(),
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

		const directLinks = children.tag('a').toArray();
		const slug = children.tag('span');
		const nestedItems = children.tag('ul');
		const badges = children
			.toArray()
			.filter(
				(n) => Markdoc.Tag.isTag(n) && (n as Tag).attributes?.['data-rune'] === 'badge',
			) as Tag[];

		const paragraphs = children.tag('p').toArray();
		const linkParagraphs: Tag[] = [];
		const descriptionParagraphs: Tag[] = [];
		for (const p of paragraphs) {
			const hasLink = p.children.some((c) => Markdoc.Tag.isTag(c) && (c as Tag).name === 'a');
			if (hasLink) linkParagraphs.push(p);
			else descriptionParagraphs.push(p);
		}
		const linksFromParagraphs: Tag[] = linkParagraphs.flatMap((p) =>
			p.children.filter((c): c is Tag => Markdoc.Tag.isTag(c) && (c as Tag).name === 'a'),
		);
		const allLinks: Tag[] = [...directLinks, ...linksFromParagraphs];

		const descriptionText: RenderableTreeNode[] = descriptionParagraphs.flatMap((p) => p.children);
		const description =
			descriptionText.length > 0
				? new Markdoc.Tag(
						'span',
						{
							'data-name': 'description',
							class: 'rf-nav-item__description',
						},
						descriptionText,
					)
				: undefined;

		if (allLinks.length > 0) {
			const enrichedLinks = description
				? allLinks.map((a) => ({
						...a,
						children: [...(a.children ?? []), description],
					}))
				: allLinks;
			const extraChildren: RenderableTreeNode[] = [];
			if (badges.length > 0) {
				for (const b of badges) b.attributes['data-name'] = 'badge';
				extraChildren.push(...badges);
			}
			return createComponentRenderable({
				rune: 'nav-item',
				tag: 'li',
				properties: description ? { description } : {},
				children: [...enrichedLinks, ...extraChildren],
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
				children: nestedItems.count() > 0 ? nestedItems.flatten().tag('li') : undefined,
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
		if (Markdoc.Tag.isTag(node) && /^h[1-6]$/.test(node.name)) {
			flush();
			currentGroup = { kind: 'group', heading: node, children: [] };
			continue;
		}

		if (Markdoc.Tag.isTag(node) && node.name === 'hr') {
			if (currentGroup) {
				flush();
			}
			sequence.push({ kind: 'column-break' });
			continue;
		}

		if (!currentGroup) {
			if (Markdoc.Tag.isTag(node) && isListNode(node)) {
				topLevel.push(
					...node.children.filter((c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li'),
				);
			}
			continue;
		}

		currentGroup.children.push(node);
	}

	flush();
	return { topLevel, sequence };
}

function partitionGroupChildren(children: RenderableTreeNode[]): {
	intro?: RenderableTreeNode;
	body: RenderableTreeNode[];
	footer?: RenderableTreeNode;
} {
	const isBodyBlock = (c: RenderableTreeNode): boolean => {
		if (!Markdoc.Tag.isTag(c)) return false;
		if (c.name === 'ul' || c.name === 'ol') return true;
		return Boolean(c.attributes?.['data-rune']);
	};
	const isSlotCandidate = (c: RenderableTreeNode): boolean => {
		return Markdoc.Tag.isTag(c) && !isBodyBlock(c);
	};

	let firstBodyIdx = -1;
	let lastBodyIdx = -1;
	children.forEach((c, i) => {
		if (isBodyBlock(c)) {
			if (firstBodyIdx === -1) firstBodyIdx = i;
			lastBodyIdx = i;
		}
	});

	let introIdx: number | undefined;
	let footerIdx: number | undefined;

	if (firstBodyIdx !== -1) {
		for (let i = 0; i < firstBodyIdx; i++) {
			if (isSlotCandidate(children[i])) {
				introIdx = i;
				break;
			}
		}
		for (let i = children.length - 1; i > lastBodyIdx; i--) {
			if (isSlotCandidate(children[i])) {
				footerIdx = i;
				break;
			}
		}
	} else {
		const slots: number[] = [];
		children.forEach((c, i) => {
			if (isSlotCandidate(c)) slots.push(i);
		});
		if (slots.length === 1) {
			introIdx = slots[0];
		} else if (slots.length >= 2) {
			introIdx = slots[0];
			footerIdx = slots[slots.length - 1];
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

function buildGroupTag(group: ParsedGroup): Tag<'section'> {
	const { intro, body, footer } = partitionGroupChildren(group.children);

	const items: Tag[] = [];
	for (const c of body) {
		if (Markdoc.Tag.isTag(c) && isListNode(c)) {
			items.push(
				...c.children.filter((x): x is Tag<'li'> => Markdoc.Tag.isTag(x) && x.name === 'li'),
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
		ordered: {
			type: Boolean,
			required: false,
			description: 'Use numbered list for navigation items',
		},
		auto: {
			type: Boolean,
			required: false,
			description: 'Automatically generate from child pages',
		},
		layout: {
			type: String,
			required: false,
			matches: ['vertical', 'menubar', 'columns', 'cards', 'strip'],
			description:
				'Presentation layout: sidebar (vertical), horizontal menubar (header), column grid (footer), cards (section landing), or strip (compact secondary nav). Defaults to vertical.',
		},
		collapsible: {
			type: Boolean,
			required: false,
			description:
				'Make each group collapsible. The group containing the current page auto-expands; others start collapsed. Only meaningful for vertical layout.',
		},
		defaultOpen: {
			type: String,
			required: false,
			description:
				'Comma-separated group titles to expand by default, overriding the URL-driven auto-open behaviour.',
		},
	},
	contentModel: {
		type: 'custom',
		processChildren: (nodes) => headingsToList({ level: 1 })(nodes as Node[]),
		description:
			"Top-level (#) headings become nav groups; the list directly under each heading becomes the group's items. Items are page slugs — wrap in markdown links to set custom labels, or use plain text to resolve the page title. Without headings, a single list becomes a flat nav.",
	},
	transform(resolved, attrs, config) {
		const collapsible = Boolean(attrs.collapsible);
		const sourcePath = (config as { variables?: { __sourcePath?: string } }).variables
			?.__sourcePath;

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
				const trigger = new Markdoc.Tag(
					'button',
					{
						'data-name': 'trigger',
						type: 'button',
						'aria-label': 'Toggle navigation',
						'aria-expanded': 'false',
					},
					[],
				);
				return [trigger, ...children];
			}
			return children;
		};

		if (attrs.auto) {
			const sentinelMeta = new Markdoc.Tag('meta', {
				'data-field': NAV_AUTO_SENTINEL,
				content: 'true',
			});

			return forwardLayout(
				createComponentRenderable({
					rune: 'nav',
					tag: 'nav',
					properties: {
						group: [],
						item: [],
					},
					children: maybeWithTrigger([sentinelMeta]),
				}),
			);
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

		if (attrs.layout === 'strip') {
			const flatItems = children.flatten().tag('li');
			return forwardLayout(
				createComponentRenderable({
					rune: 'nav',
					tag: 'nav',
					class: attrs.ordered ? 'ordered' : undefined,
					properties: {
						group: [],
						item: flatItems,
					},
					children: children.toArray(),
				}),
			);
		}

		const { topLevel, sequence } = parseNavStructure(children.toArray());
		const groups = sequence.filter((s): s is ParsedGroup => s.kind === 'group');
		const hasGroups = groups.length > 0;
		const hasColumnBreaks = sequence.some((s) => s.kind === 'column-break');

		if (!hasGroups) {
			if (attrs.layout === 'columns' && hasColumnBreaks) {
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
					(col) => new Markdoc.Tag('div', { 'data-name': 'column' }, col),
				);
				const allItems = children.flatten().tag('li');
				return forwardLayout(
					createComponentRenderable({
						rune: 'nav',
						tag: 'nav',
						class: attrs.ordered ? 'ordered' : undefined,
						properties: {
							group: [],
							item: allItems,
						},
						children: maybeWithTrigger(columnTags),
					}),
				);
			}

			const allItems = children.flatten().tag('li');
			return forwardLayout(
				createComponentRenderable({
					rune: 'nav',
					tag: 'nav',
					class: attrs.ordered ? 'ordered' : undefined,
					properties: {
						group: [],
						item: allItems,
					},
					children: maybeWithTrigger(children.toArray()),
				}),
			);
		}

		const groupTags = groups.map(buildGroupTag);

		if (collapsible) {
			for (const group of groupTags) {
				group.attributes['data-collapsed'] = NAV_COLLAPSED_AUTO;
			}
		}

		const topLevelContainer =
			topLevel.length > 0
				? new Markdoc.Tag('div', { 'data-name': 'top-level' }, [
						new Markdoc.Tag('ul', {}, topLevel),
					])
				: null;

		const allGroupItems = groupTags.flatMap((g) => {
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

		if (attrs.layout === 'columns' && hasColumnBreaks) {
			const columns = bucketColumns(sequence);
			const groupTagByRef = new Map(groups.map((g, i) => [g, groupTags[i]]));
			const columnTags = columns.map(
				(col) =>
					new Markdoc.Tag(
						'div',
						{ 'data-name': 'column' },
						col.map((g) => groupTagByRef.get(g)!).filter(Boolean) as RenderableTreeNode[],
					),
			);
			return forwardLayout(
				createComponentRenderable({
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
				}),
			);
		}

		return forwardLayout(
			createComponentRenderable({
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
			}),
		);
	},
});
