<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const hintType = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'hintType')
		?.attributes?.content ?? 'note');

</script>

<aside class="hint hint-{hintType}" role="note">
	<div class="hint-header">
		<span class="hint-icon">
			{#if hintType === 'note'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="8" cy="8" r="6.25" />
					<path d="M8 7v4" />
					<circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none" />
				</svg>
			{:else if hintType === 'warning'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.5 9.5A1 1 0 0 1 13.5 13.5h-11a1 1 0 0 1-.87-1.5l5.5-9.5z" />
					<path d="M8 6v3" />
					<circle cx="8" cy="11" r="0.75" fill="currentColor" stroke="none" />
				</svg>
			{:else if hintType === 'caution'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5.25 1.75h5.5l3.5 3.5v5.5l-3.5 3.5h-5.5l-3.5-3.5v-5.5l3.5-3.5z" />
					<path d="M6 6l4 4M10 6l-4 4" />
				</svg>
			{:else if hintType === 'check'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="8" cy="8" r="6.25" />
					<path d="M5.5 8.5l2 2 3-4" />
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="8" cy="8" r="6.25" />
					<path d="M8 7v4" />
					<circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none" />
				</svg>
			{/if}
		</span>
		<span class="hint-title">{hintType}</span>
	</div>
	<div class="hint-body">
		{@render children()}
	</div>
</aside>

<style>
	.hint {
		--hint-color: var(--color-info);
		--hint-bg: var(--color-info-bg);
		--hint-border: var(--color-info-border);
		border-left: 3px solid var(--hint-color);
		padding: 0.875rem 1.25rem;
		margin: 1.5rem 0;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		background: var(--hint-bg);
	}
	.hint-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}
	.hint-icon {
		display: flex;
		align-items: center;
		color: var(--hint-color);
	}
	.hint-title {
		font-weight: 600;
		text-transform: capitalize;
		font-size: 0.8rem;
		letter-spacing: 0.03em;
		color: var(--hint-color);
	}
	.hint-body {
		font-size: 0.925rem;
		line-height: 1.65;
	}
	.hint-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.hint-note {
		--hint-color: var(--color-info);
		--hint-bg: var(--color-info-bg);
	}
	.hint-warning {
		--hint-color: var(--color-warning);
		--hint-bg: var(--color-warning-bg);
	}
	.hint-caution {
		--hint-color: var(--color-danger);
		--hint-bg: var(--color-danger-bg);
	}
	.hint-check {
		--hint-color: var(--color-success);
		--hint-bg: var(--color-success-bg);
	}
</style>
