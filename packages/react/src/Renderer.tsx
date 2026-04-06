import { createElement, Fragment } from 'react';
import type { ReactNode, ComponentType } from 'react';
import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import { isTag, extractComponentInterface, renderToHtml } from '@refrakt-md/transform';

export interface RendererProps {
	node: RendererNode;
	/** typeof name → React component (component overrides) */
	components?: Record<string, ComponentType<any>>;
	/** HTML element name → React component (element-level overrides) */
	elements?: Record<string, ComponentType<any>>;
}

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Convert serialized tag attributes to React-compatible props.
 * - Renames `class` → `className`
 * - Strips internal `$$mdtype` attribute
 * - Drops null/undefined/false values
 * - Converts `true` to empty string (bare HTML attribute)
 */
function toReactProps(attrs: Record<string, any>): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [k, v] of Object.entries(attrs)) {
		if (k === '$$mdtype' || v === undefined || v === null || v === false) continue;
		if (k === 'class') { result.className = v; continue; }
		result[k] = v === true ? '' : v;
	}
	return result;
}

/**
 * Render a RendererNode tree as a ReactNode.
 *
 * This is the primary rendering function for the React renderer (ADR-008).
 *
 * When a tag has a `data-rune` attribute matching a registered component:
 * 1. `extractComponentInterface` partitions children into properties, named refs, and content
 * 2. Properties become named React props (scalar strings)
 * 3. Named refs become ReactNode props (pre-rendered HTML via dangerouslySetInnerHTML)
 * 4. Anonymous content becomes the `children` prop
 * 5. The original `tag` is passed for backwards-compatible escape-hatch access
 *
 * Element overrides (table, pre) receive `tag` and `children` props.
 *
 * Props are passed through explicitly (no React Context) so the renderer
 * works in both Server Components and Client Components.
 */
export function Renderer({ node, components, elements }: RendererProps): ReactNode {
	if (node === null || node === undefined) return null;
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);

	if (Array.isArray(node)) {
		return createElement(Fragment, null,
			...node.map((child, i) =>
				createElement(Renderer, { key: i, node: child, components, elements }),
			),
		);
	}

	if (!isTag(node)) return null;

	// Component override dispatch via data-rune attribute
	const runeType = node.attributes?.['data-rune'];
	const Component = runeType && components?.[runeType];

	if (Component) {
		const iface = extractComponentInterface(node);

		// Convert named refs to ReactNode values (pre-rendered HTML)
		const refNodes: Record<string, ReactNode> = {};
		for (const [name, tags] of Object.entries(iface.refs)) {
			const html = tags.map(t => renderToHtml(t)).join('');
			refNodes[name] = createElement('div', {
				'data-ref': name,
				dangerouslySetInnerHTML: { __html: html },
			});
		}

		// Convert anonymous children to ReactNode
		const childContent = iface.children.length > 0
			? createElement(Fragment, null,
				...iface.children.map((child, i) =>
					createElement(Renderer, { key: i, node: child, components, elements }),
				),
			)
			: undefined;

		return createElement(Component, {
			...iface.properties,
			...refNodes,
			children: childContent,
			tag: node,
		});
	}

	// Element override dispatch via tag name
	const ElementOverride = elements?.[node.name];

	if (ElementOverride) {
		return createElement(ElementOverride, { tag: node },
			...node.children.map((child, i) =>
				createElement(Renderer, { key: i, node: child, components, elements }),
			),
		);
	}

	// SVG — render as raw HTML to avoid namespace issues
	if (node.name === 'svg') {
		return createElement('span', {
			dangerouslySetInnerHTML: { __html: renderToHtml(node) },
		});
	}

	// Null-named tags (Markdoc document root) — render children without wrapper
	if (!node.name) {
		return createElement(Fragment, null,
			...node.children.map((child, i) =>
				createElement(Renderer, { key: i, node: child, components, elements }),
			),
		);
	}

	// Void elements
	if (VOID_ELEMENTS.has(node.name)) {
		return createElement(node.name, toReactProps(node.attributes));
	}

	// Raw HTML content (code blocks, raw-html attribute)
	const isRaw = node.attributes?.['data-codeblock'] || node.attributes?.['data-raw-html'];
	if (isRaw) {
		const html = node.children.map(child => {
			if (typeof child === 'string') return child;
			return renderToHtml(child);
		}).join('');
		return createElement(node.name, {
			...toReactProps(node.attributes),
			dangerouslySetInnerHTML: { __html: html },
		});
	}

	// Regular HTML element — recursively render children
	return createElement(node.name, toReactProps(node.attributes),
		...node.children.map((child, i) =>
			createElement(Renderer, { key: i, node: child, components, elements }),
		),
	);
}
