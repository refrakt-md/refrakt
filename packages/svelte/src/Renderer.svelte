<script lang="ts" module>
	export type { SerializedTag, RendererNode } from './types.js';
</script>

<script lang="ts">
	import type { Component } from 'svelte';
	import type { SerializedTag, RendererNode } from './types.js';
	import { getComponent, getElementOverrides } from './context.js';
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
			result[k] = v === true ? '' : String(v);
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
			.map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
			.join('');
		const children = tag.children.map(child => {
			if (typeof child === 'string') return escapeAttr(child);
			if (isTag(child)) return svgToHtml(child);
			return '';
		}).join('');
		return `<${tag.name}${attrs}>${children}</${tag.name}>`;
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
	{@const Component = node.attributes?.typeof ? getComponent(node.attributes.typeof) : undefined}
	{@const ElementOverride = !Component && merged?.[node.name] ? merged[node.name] : undefined}
	{#if Component}
		<Component tag={node}>
			{#each node.children as child}
				<Renderer node={child} overrides={merged} />
			{/each}
		</Component>
	{:else if ElementOverride}
		<ElementOverride tag={node}>
			{#each node.children as child}
				<Renderer node={child} overrides={merged} />
			{/each}
		</ElementOverride>
	{:else if node.name === 'svg'}
		{@html svgToHtml(node)}
	{:else}
		<svelte:element this={node.name} {...htmlAttrs(node.attributes)}>
			{#each node.children as child}
				{#if node.attributes?.['data-codeblock'] && typeof child === 'string'}
					{@html child}
				{:else}
					<Renderer node={child} overrides={merged} />
				{/if}
			{/each}
		</svelte:element>
	{/if}
{/if}
