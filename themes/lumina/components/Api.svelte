<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const method = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'method')?.attributes?.content || 'GET';
	const path = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'path')?.attributes?.content || '';
	const auth = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'auth')?.attributes?.content || '';

	const methodColors: Record<string, { color: string; bg: string }> = {
		GET: { color: 'var(--rf-color-success)', bg: 'var(--rf-color-success-bg)' },
		POST: { color: 'var(--rf-color-info)', bg: 'var(--rf-color-info-bg)' },
		PUT: { color: 'var(--rf-color-warning)', bg: 'var(--rf-color-warning-bg)' },
		PATCH: { color: 'var(--rf-color-warning)', bg: 'var(--rf-color-warning-bg)' },
		DELETE: { color: 'var(--rf-color-danger)', bg: 'var(--rf-color-danger-bg)' },
		HEAD: { color: 'var(--rf-color-muted)', bg: 'var(--rf-color-surface)' },
		OPTIONS: { color: 'var(--rf-color-muted)', bg: 'var(--rf-color-surface)' },
	};

	const mc = methodColors[method] || methodColors.GET;
</script>

<article class="rf-api" typeof="Api">
	<div class="rf-api__header">
		<span class="rf-api__method" style="color: {mc.color}; background: {mc.bg};">
			{method}
		</span>
		<code class="rf-api__path">{path}</code>
		{#if auth}
			<span class="rf-api__auth">
				{auth}
			</span>
		{/if}
	</div>
	<div class="rf-api__body">
		{@render children()}
	</div>
</article>
