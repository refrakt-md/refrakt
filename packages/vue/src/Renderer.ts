import { defineComponent, h, type VNode, type Component } from 'vue';
import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import { isTag, extractComponentInterface, renderToHtml } from '@refrakt-md/transform';

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Convert serialized tag attributes to Vue-compatible props.
 * - Strips internal `$$mdtype` attribute
 * - Drops null/undefined/false values
 * - Converts `true` to empty string (bare HTML attribute)
 */
function toVueProps(attrs: Record<string, any>): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [k, v] of Object.entries(attrs)) {
		if (k === '$$mdtype' || v === undefined || v === null || v === false) continue;
		result[k] = v === true ? '' : v;
	}
	return result;
}

/**
 * Render a single RendererNode to a VNode tree.
 */
function renderNode(
	node: RendererNode,
	components?: Record<string, Component>,
	elements?: Record<string, Component>,
): VNode | string | null {
	if (node === null || node === undefined) return null;
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);

	if (Array.isArray(node)) {
		const children = node.map(child => renderNode(child, components, elements)).filter(Boolean);
		return children.length === 1 ? children[0]! : h('template', null, children);
	}

	if (!isTag(node)) return null;

	// Component override dispatch via data-rune attribute
	const runeType = node.attributes?.['data-rune'];
	const Comp = runeType && components?.[runeType];

	if (Comp) {
		const iface = extractComponentInterface(node);

		// Build named slots from refs (pre-rendered HTML)
		const slots: Record<string, () => VNode> = {};
		for (const [name, tags] of Object.entries(iface.refs)) {
			const html = tags.map(t => renderToHtml(t)).join('');
			slots[name] = () => h('div', { 'data-ref': name, innerHTML: html });
		}

		// Default slot from anonymous children
		if (iface.children.length > 0) {
			const childVnodes = iface.children
				.map(child => renderNode(child, components, elements))
				.filter(Boolean) as VNode[];
			slots.default = () => h('template', null, childVnodes);
		}

		return h(Comp, { ...iface.properties, tag: node }, slots);
	}

	// Element override dispatch via tag name
	const ElementOverride = elements?.[node.name];

	if (ElementOverride) {
		const childVnodes = node.children
			.map(child => renderNode(child, components, elements))
			.filter(Boolean) as VNode[];
		return h(ElementOverride, { tag: node }, { default: () => childVnodes });
	}

	// SVG — render as raw HTML to avoid namespace issues
	if (node.name === 'svg') {
		return h('span', { innerHTML: renderToHtml(node) });
	}

	// Null-named tags (Markdoc document root) — render children without wrapper
	if (!node.name) {
		const childVnodes = node.children
			.map(child => renderNode(child, components, elements))
			.filter(Boolean) as VNode[];
		return h('template', null, childVnodes);
	}

	// Void elements
	if (VOID_ELEMENTS.has(node.name)) {
		return h(node.name, toVueProps(node.attributes));
	}

	// Raw HTML content (code blocks, raw-html attribute)
	const isRaw = node.attributes?.['data-codeblock'] || node.attributes?.['data-raw-html'];
	if (isRaw) {
		const html = node.children.map(child => {
			if (typeof child === 'string') return child;
			return renderToHtml(child);
		}).join('');
		return h(node.name, { ...toVueProps(node.attributes), innerHTML: html });
	}

	// Regular HTML element — recursively render children
	const childVnodes = node.children
		.map(child => renderNode(child, components, elements))
		.filter(Boolean) as VNode[];
	return h(node.name, toVueProps(node.attributes), childVnodes);
}

/**
 * Vue Renderer component for refrakt.md content (ADR-008).
 *
 * Recursively renders a RendererNode tree as Vue vnodes.
 *
 * When a tag has a `data-rune` attribute matching a registered component:
 * 1. `extractComponentInterface` partitions children into properties, named refs, and content
 * 2. Properties become component props (scalar strings)
 * 3. Named refs become named slots (pre-rendered HTML)
 * 4. Anonymous content becomes the default slot
 * 5. The original `tag` is passed as a prop for escape-hatch access
 */
export const Renderer = defineComponent({
	name: 'RfRenderer',
	props: {
		node: { type: [Object, String, Number, Array] as any, default: null },
		components: { type: Object as () => Record<string, Component>, default: undefined },
		elements: { type: Object as () => Record<string, Component>, default: undefined },
	},
	setup(props) {
		return () => renderNode(props.node, props.components, props.elements);
	},
});
