<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	const isGroup = $derived(tag.attributes.typeof === 'Steps');

	const split = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'split')
		?.attributes?.content ?? '');

	const mainEl = $derived(tag.children.find(
		(c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'main'
	));

	const showcaseEl = $derived(tag.children.find(
		(c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'showcase'
	));

	const hasSplit = $derived(!!split && !!showcaseEl);

	function gridColumns(splitStr: string): string {
		const parts = splitStr.split(' ').map(Number);
		if (parts.length !== 2) return '1fr 1fr';
		return `${parts[0]}fr ${parts[1]}fr`;
	}
</script>

{#if isGroup}
	<ol class="steps">
		{@render children()}
	</ol>
{:else if hasSplit}
	<li class="step step-split">
		<div class="step-main">
			{#if mainEl}<Renderer node={mainEl.children} />{/if}
		</div>
		<div class="step-showcase" style:grid-column="2" style:grid-row="1">
			{#if showcaseEl}<Renderer node={showcaseEl.children} />{/if}
		</div>
	</li>
{:else}
	<li class="step">
		{@render children()}
	</li>
{/if}

<style>
	.steps {
		counter-reset: step;
		list-style: none;
		padding-left: 0;
		margin: 1.5rem 0;
	}
	.step {
		counter-increment: step;
		position: relative;
		padding-left: 3.25rem;
		padding-bottom: 1.75rem;
		border-left: 2px solid var(--color-border);
		margin-left: 0.875rem;
	}
	.step:last-child {
		border-left-color: transparent;
		padding-bottom: 0;
	}
	.step::before {
		content: counter(step);
		position: absolute;
		left: -0.9375rem;
		top: 0;
		width: 1.875rem;
		height: 1.875rem;
		background: var(--color-primary);
		color: white;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 650;
		font-size: 0.8rem;
		box-shadow: 0 0 0 4px var(--color-bg);
	}
	.step :global(h3),
	.step :global(strong) {
		display: block;
		margin-top: 0;
		margin-bottom: 0.375rem;
	}
	.step :global(p) {
		color: var(--color-muted);
		font-size: 0.925rem;
		line-height: 1.65;
	}
	.step-split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	.step-showcase {
		border-radius: var(--radius-md);
		overflow: hidden;
	}
</style>
