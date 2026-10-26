import type { RendererNode, SerializedTag } from '@refrakt-md/types';
import { isTag } from './helpers.js';

/**
 * Whole-region links — SPEC-160 D8, WORK-655.
 *
 * A block `{% link %}` reaches the engine as a marker element carrying
 * `data-link-href` (and `data-link-label` when the author gave `aria-label`).
 * The schema cannot decide how to render it: links are added after a rune's
 * transform has run (entity auto-links in `postProcess`, resolved `{% ref %}`),
 * so only here, on the final tree, is it known whether the content is
 * interactive. Then:
 *
 * - **wrap** — nothing interactive inside: the marker becomes a real
 *   `<a data-link="wrap">` around the content.
 * - **stretch** — something interactive inside, where an `<a>` around it would
 *   nest interactive content (invalid HTML). An `<a data-link="stretch">` is
 *   appended instead, inside the wrapped rune's root when the content is one
 *   rune, else inside a `<div data-link="host">` around the content. It covers
 *   the region; the inner links stay clickable above it.
 *
 * Every stretched anchor, including the ones `card` and `bento-cell` emit for
 * `href`, is labelled here: by its `aria-label` when one was given, else by the
 * host's title slot (`aria-labelledby`), else by the host's text. It is a real,
 * focusable link — never `aria-hidden`.
 *
 * The marker emits no `data-rune`, so it is never a name-resolution boundary
 * (SPEC-145 D19), and it never reaches the HTML.
 */

/** Elements that make content interactive for the wrap-or-stretch choice. */
const INTERACTIVE_TAGS = new Set([
	'a',
	'button',
	'input',
	'select',
	'textarea',
	'details',
	'summary',
	'iframe',
	'audio',
	'video',
	'embed',
	'object',
	'label',
]);

/** The slot names a stretched anchor is labelled by, in priority order. */
const TITLE_NAMES = ['title', 'headline', 'name'];

export function resolveLinkRegions(
	tree: RendererNode,
	interactiveRunes: ReadonlySet<string>,
): RendererNode {
	let labels = 0;
	const nextLabelId = () => `rf-link-label-${++labels}`;

	const isInteractive = (node: RendererNode): boolean => {
		if (Array.isArray(node)) return node.some(isInteractive);
		if (!isTag(node)) return false;
		const { name, attributes } = node;
		if (INTERACTIVE_TAGS.has(name)) return true;
		if (attributes?.tabindex !== undefined || attributes?.contenteditable !== undefined) {
			return true;
		}
		const rune = attributes?.['data-rune'];
		if (typeof rune === 'string' && interactiveRunes.has(rune)) return true;
		return node.children.some(isInteractive);
	};

	const visit = (node: RendererNode): RendererNode | RendererNode[] => {
		if (Array.isArray(node)) return node.flatMap((n) => toArray(visit(n)));
		if (!isTag(node)) return node;
		const children = node.children.flatMap((c) => toArray(visit(c)));

		const href = node.attributes?.['data-link-href'];
		if (href === undefined) return labelStretched({ ...node, children });

		const label = node.attributes['data-link-label'];
		// An empty `href` renders the content unchanged, so a template can write
		// `{% link href=$attrs.href %}` unconditionally.
		if (!href) return children;

		if (!isInteractive(children)) {
			return {
				$$mdtype: 'Tag',
				name: 'a',
				attributes: { href, 'data-link': 'wrap', ...(label ? { 'aria-label': label } : {}) },
				children,
			} as SerializedTag;
		}

		const anchor = stretchedAnchor(href, label);
		const tags = children.filter(isTag);
		const onlyRune =
			tags.length === 1 &&
			children.every((c) => isTag(c) || (typeof c === 'string' && c.trim() === '')) &&
			tags[0].attributes?.['data-rune']
				? tags[0]
				: undefined;
		if (onlyRune) {
			const block = blockOf(onlyRune);
			if (block) anchor.attributes.class = `${block}__link`;
			return labelStretched({ ...onlyRune, children: [...onlyRune.children, anchor] });
		}
		return labelStretched({
			$$mdtype: 'Tag',
			name: 'div',
			attributes: { 'data-link': 'host' },
			children: [...children, anchor],
		} as SerializedTag);
	};

	/** Label the stretched anchor a host holds directly, if it has none. */
	const labelStretched = (host: SerializedTag): SerializedTag => {
		const index = host.children.findIndex(
			(c) => isTag(c) && c.name === 'a' && c.attributes?.['data-link'] === 'stretch',
		);
		if (index === -1) return host;
		const anchor = host.children[index] as SerializedTag;
		if (anchor.attributes['aria-label'] || anchor.attributes['aria-labelledby']) return host;

		const rest = host.children.filter((_, i) => i !== index);
		const title = findTitle(rest);
		let labelled: Record<string, string>;
		let children = rest;
		if (title) {
			const id = (title.node.attributes.id as string | undefined) ?? nextLabelId();
			if (!title.node.attributes.id) {
				children = replaceNode(rest, title.node, {
					...title.node,
					attributes: { ...title.node.attributes, id },
				});
			}
			labelled = { 'aria-labelledby': id };
		} else {
			const text = textOf(rest).replace(/\s+/g, ' ').trim().slice(0, 120);
			labelled = text ? { 'aria-label': text } : {};
		}
		const next = { ...anchor, attributes: { ...anchor.attributes, ...labelled } };
		children = [...children];
		children.splice(index, 0, next);
		return { ...host, children };
	};

	const out = visit(tree);
	return Array.isArray(out) && !Array.isArray(tree) ? out[0] : (out as RendererNode);
}

function toArray(n: RendererNode | RendererNode[]): RendererNode[] {
	return Array.isArray(n) ? n : [n];
}

function stretchedAnchor(href: string, label: string | undefined): SerializedTag {
	return {
		$$mdtype: 'Tag',
		name: 'a',
		attributes: {
			href,
			'data-name': 'link',
			'data-link': 'stretch',
			...(label ? { 'aria-label': label } : {}),
		},
		children: [],
	} as SerializedTag;
}

/** A rune root's BEM block class, e.g. `rf-figure`. */
function blockOf(root: SerializedTag): string | undefined {
	const classes = String(root.attributes?.class ?? '').split(/\s+/);
	return classes.find((c) => /^rf-[a-z0-9-]+$/.test(c) && !c.includes('__'));
}

/** The first title slot in `nodes`, else the first heading. */
function findTitle(nodes: RendererNode[]): { node: SerializedTag } | undefined {
	let heading: SerializedTag | undefined;
	const named = new Map<string, SerializedTag>();
	const walk = (n: RendererNode) => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!isTag(n)) return;
		const dataName = n.attributes?.['data-name'];
		if (typeof dataName === 'string' && TITLE_NAMES.includes(dataName) && !named.has(dataName)) {
			named.set(dataName, n);
		}
		if (!heading && /^h[1-6]$/.test(n.name)) heading = n;
		n.children.forEach(walk);
	};
	walk(nodes);
	for (const name of TITLE_NAMES) {
		const hit = named.get(name);
		if (hit) return { node: hit };
	}
	return heading ? { node: heading } : undefined;
}

function replaceNode(
	nodes: RendererNode[],
	target: SerializedTag,
	replacement: SerializedTag,
): RendererNode[] {
	return nodes.map((n) => {
		if (n === target) return replacement;
		if (!isTag(n)) return n;
		return { ...n, children: replaceNode(n.children, target, replacement) };
	});
}

function textOf(n: RendererNode | RendererNode[]): string {
	if (Array.isArray(n)) return n.map(textOf).join(' ');
	if (typeof n === 'string' || typeof n === 'number') return String(n);
	if (!isTag(n)) return '';
	return textOf(n.children);
}
