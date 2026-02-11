<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
	const isGroup = tag.attributes.typeof === 'Steps';
</script>

{#if isGroup}
	<ol class="steps">
		{@render children()}
	</ol>
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
</style>
