<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isEntry = tag.attributes.typeof === 'TimelineEntry';

	const direction = tag.children
		?.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'direction')
		?.attributes?.content ?? 'vertical';
</script>

{#if isEntry}
	<li class="timeline-entry">
		<div class="timeline-marker"></div>
		<div class="timeline-entry-content">
			{@render children()}
		</div>
	</li>
{:else}
	<section class="timeline timeline-{direction}">
		{@render children()}
	</section>
{/if}

<style>
	.timeline {
		margin: 2rem 0;
	}
	.timeline :global(ol) {
		list-style: none;
		padding: 0;
		margin: 0;
		position: relative;
	}
	.timeline-vertical :global(ol) {
		padding-left: 2rem;
		border-left: 2px solid var(--color-border);
	}
	.timeline-entry {
		position: relative;
		padding: 0 0 2rem;
	}
	.timeline-entry:last-child {
		padding-bottom: 0;
	}
	.timeline-marker {
		position: absolute;
		left: -2.5625rem;
		top: 0.35rem;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-primary);
		border: 2px solid var(--color-bg);
		box-shadow: 0 0 0 2px var(--color-primary);
	}
	.timeline-entry-content :global(time) {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-primary);
		letter-spacing: 0.02em;
		margin-bottom: 0.25rem;
	}
	.timeline-entry-content :global(span) {
		display: block;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}
	.timeline-entry-content :global(div) {
		font-size: 0.925rem;
		line-height: 1.65;
		color: var(--color-muted);
	}
	.timeline-entry-content :global(div p:last-child) {
		margin-bottom: 0;
	}

	/* Horizontal layout */
	.timeline-horizontal :global(ol) {
		display: flex;
		gap: 2rem;
		overflow-x: auto;
		padding: 2rem 0 1rem;
		border-left: none;
		border-top: 2px solid var(--color-border);
	}
	.timeline-horizontal .timeline-entry {
		min-width: 200px;
		padding: 0;
	}
	.timeline-horizontal .timeline-marker {
		left: 0;
		top: -2.5rem;
	}
</style>
