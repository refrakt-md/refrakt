<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const date = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'date')?.attributes?.content || '';
	const endDate = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'endDate')?.attributes?.content || '';
	const location = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'location')?.attributes?.content || '';
	const url = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'url')?.attributes?.content || '';
</script>

<article class="event" typeof="Event">
	<div class="event-details">
		{#if date}
			<div class="event-detail">
				<span class="event-label">Date</span>
				<span class="event-value">{date}{#if endDate} — {endDate}{/if}</span>
			</div>
		{/if}
		{#if location}
			<div class="event-detail">
				<span class="event-label">Location</span>
				<span class="event-value">{location}</span>
			</div>
		{/if}
		{#if url}
			<div class="event-detail">
				<a href={url} class="event-register">Register</a>
			</div>
		{/if}
	</div>
	<div class="event-content">
		{@render children()}
	</div>
</article>

<style>
	.event {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 2rem;
		margin: 1.5rem 0;
	}

	.event-details {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding-bottom: 1rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.event-detail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.event-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
	}

	.event-value {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.event-register {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--color-primary);
		color: #fff;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.875rem;
		text-decoration: none;
		margin-top: 0.25rem;
	}

	.event-register:hover {
		background: var(--color-primary-hover);
	}

	.event-content :global(ul), .event-content :global(ol) {
		padding-left: 1.5rem;
	}
</style>
