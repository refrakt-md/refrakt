<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const method = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'method')?.attributes?.content || 'GET';
	const path = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'path')?.attributes?.content || '';
	const auth = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'auth')?.attributes?.content || '';

	const methodColors: Record<string, { color: string; bg: string }> = {
		GET: { color: '#059669', bg: '#ecfdf5' },
		POST: { color: '#2563eb', bg: '#eff6ff' },
		PUT: { color: '#d97706', bg: '#fffbeb' },
		PATCH: { color: '#d97706', bg: '#fffbeb' },
		DELETE: { color: '#dc2626', bg: '#fef2f2' },
		HEAD: { color: '#6b7280', bg: '#f9fafb' },
		OPTIONS: { color: '#6b7280', bg: '#f9fafb' },
	};

	const mc = methodColors[method] || methodColors.GET;
</script>

<article class="api-endpoint" typeof="Api">
	<div class="api-header">
		<span class="api-method" style="color: {mc.color}; background: {mc.bg};">
			{method}
		</span>
		<code class="api-path">{path}</code>
		{#if auth}
			<span class="api-auth">
				{auth}
			</span>
		{/if}
	</div>
	<div class="api-body">
		{@render children()}
	</div>
</article>

<style>
	.api-endpoint {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		margin: 1.5rem 0;
		overflow: hidden;
	}

	.api-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--color-surface-hover);
		border-bottom: 1px solid var(--color-border);
	}

	.api-method {
		font-weight: 700;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
	}

	.api-path {
		font-family: var(--font-mono);
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.api-auth {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--color-muted);
		background: var(--color-surface-active);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	.api-body {
		padding: 1.25rem;
	}

	.api-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	.api-body :global(th) {
		text-align: left;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-muted);
		border-bottom: 2px solid var(--color-border);
	}

	.api-body :global(td) {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.875rem;
	}

	.api-body :global(pre) {
		border-radius: var(--radius-md);
		margin: 1rem 0;
	}

	.api-body :global(blockquote) {
		border-left: 3px solid var(--color-warning-border);
		background: var(--color-warning-bg);
		padding: 0.75rem 1rem;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		margin: 1rem 0;
	}
</style>
