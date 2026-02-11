<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const hintType = tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'hintType')
		?.attributes?.content ?? 'note';

	const icons: Record<string, string> = {
		note: 'ℹ',
		warning: '⚠',
		caution: '⛔',
		check: '✓',
	};
</script>

<aside class="hint hint-{hintType}" role="note">
	<div class="hint-header">
		<span class="hint-icon">{icons[hintType] ?? 'ℹ'}</span>
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
		font-size: 0.875rem;
		line-height: 1;
		opacity: 0.9;
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
