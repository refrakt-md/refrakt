<script lang="ts" module>
	export type { SerializedTag, RendererNode } from './types.js';
</script>

<script lang="ts">
	import { createRawSnippet } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { Component } from 'svelte';
	import type { SerializedTag, RendererNode } from './types.js';
	import { getComponent, getElementOverrides } from './context.js';
	import { extractComponentInterface } from '@refrakt-md/transform';
	import Renderer from './Renderer.svelte';

	let { node, overrides }: { node: RendererNode; overrides?: Record<string, Component<any>> } = $props();

	function isTag(n: unknown): n is SerializedTag {
		return n !== null && typeof n === 'object' && (n as any).$$mdtype === 'Tag';
	}

	/** Filter out attributes that shouldn't be rendered as HTML attributes */
	function htmlAttrs(attrs: Record<string, any>): Record<string, any> {
		const result: Record<string, any> = {};
		for (const [k, v] of Object.entries(attrs)) {
			if (v === undefined || v === null || v === false) continue;
			result[k] = v === true ? true : String(v);
		}
		return result;
	}

	function escapeAttr(str: string): string {
		return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/** Serialize an SVG tag tree to HTML string. Using {@html} avoids SVG namespace
	 *  issues that occur when <svelte:element> creates child SVG elements (path, circle, etc.)
	 *  outside the SVG namespace context during client-side navigation. */
	function svgToHtml(tag: SerializedTag): string {
		const attrs = Object.entries(htmlAttrs(tag.attributes))
			.map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${escapeAttr(String(v))}"`)
			.join('');
		const children = tag.children.map(child => {
			if (typeof child === 'string') return escapeAttr(child);
			if (isTag(child)) return svgToHtml(child);
			return '';
		}).join('');
		return `<${tag.name}${attrs}>${children}</${tag.name}>`;
	}

	const VOID_ELEMENTS = new Set([
		'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
		'link', 'meta', 'param', 'source', 'track', 'wbr',
	]);

	/** Render a RendererNode tree to an HTML string, handling codeblock/raw-html content */
	function nodeToHtml(n: RendererNode): string {
		if (n === null || n === undefined) return '';
		if (typeof n === 'string') return escapeAttr(n);
		if (typeof n === 'number') return String(n);
		if (Array.isArray(n)) return n.map(nodeToHtml).join('');
		if (!isTag(n)) return '';
		if (n.name === 'svg') return svgToHtml(n);

		const attrs = Object.entries(htmlAttrs(n.attributes))
			.map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${escapeAttr(String(v))}"`)
			.join('');

		if (VOID_ELEMENTS.has(n.name)) return `<${n.name}${attrs}>`;

		const isRaw = n.attributes?.['data-codeblock'] || n.attributes?.['data-raw-html'];
		const inner = n.children.map(child => {
			if (isRaw && typeof child === 'string') return child;
			return nodeToHtml(child);
		}).join('');

		return `<${n.name}${attrs}>${inner}</${n.name}>`;
	}

	/** Create a Svelte 5 snippet from an array of serialized nodes */
	function createNodeSnippet(nodes: RendererNode[]): Snippet {
		return createRawSnippet(() => ({
			render: () => {
				if (nodes.length === 1 && isTag(nodes[0])) {
					return nodeToHtml(nodes[0]);
				}
				return `<div data-snippet-wrapper>${nodes.map(nodeToHtml).join('')}</div>`;
			},
		}));
	}

	const globalOverrides = getElementOverrides();
	const merged = $derived(overrides
		? { ...globalOverrides, ...overrides }
		: globalOverrides);
</script>

{#if Array.isArray(node)}
	{#each node as child}
		<Renderer node={child} overrides={merged} />
	{/each}
{:else if node === null || node === undefined}
	<!-- empty -->
{:else if typeof node === 'string'}
	{node}
{:else if typeof node === 'number'}
	{String(node)}
{:else if isTag(node)}
	{@const Component = node.attributes?.['data-rune'] ? getComponent(node.attributes['data-rune']) : undefined}
	{@const ElementOverride = !Component && merged?.[node.name] ? merged[node.name] : undefined}
	{#if Component}
		{@const iface = extractComponentInterface(node)}
		{@const refSnippets = Object.fromEntries(
			Object.entries(iface.refs).map(([name, tags]) => [name, createNodeSnippet(tags)])
		)}
		{@const childSnippet = iface.children.length > 0 ? createNodeSnippet(iface.children) : undefined}
		<Component {...iface.properties} {...refSnippets} children={childSnippet} tag={node} />
	{:else if ElementOverride}
		<ElementOverride tag={node}>
			{#each node.children as child}
				<Renderer node={child} overrides={merged} />
			{/each}
		</ElementOverride>
	{:else if node.name === 'svg'}
		{@html svgToHtml(node)}
	{:else if VOID_ELEMENTS.has(node.name)}
		<svelte:element this={node.name} {...htmlAttrs(node.attributes)} />
	{:else}
		<svelte:element this={node.name} {...htmlAttrs(node.attributes)}>
			{#each node.children as child}
				{#if (node.attributes?.['data-codeblock'] || node.attributes?.['data-raw-html']) && typeof child === 'string'}
					{@html child}
				{:else}
					<Renderer node={child} overrides={merged} />
				{/if}
			{/each}
		</svelte:element>
	{/if}
{/if}
