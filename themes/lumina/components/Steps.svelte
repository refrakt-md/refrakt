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
	}
	.step {
		counter-increment: step;
		position: relative;
		padding-left: 3rem;
		padding-bottom: 1.5rem;
		border-left: 2px solid #e5e7eb;
		margin-left: 1rem;
	}
	.step::before {
		content: counter(step);
		position: absolute;
		left: -0.875rem;
		width: 1.75rem;
		height: 1.75rem;
		background: #3b82f6;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}
</style>
