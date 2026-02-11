<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	// Extract hint type from the meta child
	const hintType = tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'hintType')
		?.attributes?.content ?? 'note';
</script>

<aside class="hint hint-{hintType}" role="note">
	<div class="hint-title">{hintType}</div>
	<div class="hint-body">
		{@render children()}
	</div>
</aside>

<style>
	.hint {
		border-left: 4px solid var(--hint-color, #888);
		padding: 1rem 1.5rem;
		margin: 1.5rem 0;
		border-radius: 0 8px 8px 0;
		background: var(--hint-bg, #f8f8f8);
	}
	.hint-title {
		font-weight: 600;
		text-transform: capitalize;
		margin-bottom: 0.5rem;
		color: var(--hint-color, #888);
	}
	.hint-note { --hint-color: #3b82f6; --hint-bg: #eff6ff; }
	.hint-warning { --hint-color: #f59e0b; --hint-bg: #fffbeb; }
	.hint-caution { --hint-color: #ef4444; --hint-bg: #fef2f2; }
	.hint-check { --hint-color: #22c55e; --hint-bg: #f0fdf4; }
</style>
