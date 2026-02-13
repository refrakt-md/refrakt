<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const estimatedTime = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'estimatedTime')?.attributes?.content || '';
	const difficulty = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'difficulty')?.attributes?.content || '';

	function formatDuration(iso: string): string {
		if (!iso) return '';
		const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) return iso;
		const parts: string[] = [];
		if (match[1]) parts.push(`${match[1]}h`);
		if (match[2]) parts.push(`${match[2]}m`);
		if (match[3]) parts.push(`${match[3]}s`);
		return parts.join(' ') || iso;
	}
</script>

<article class="rf-howto" typeof="HowTo">
	{#if estimatedTime || difficulty}
		<div class="rf-howto__meta">
			{#if estimatedTime}
				<span class="rf-howto__meta-item">Estimated time: {formatDuration(estimatedTime)}</span>
			{/if}
			{#if difficulty}
				<span class="rf-howto__meta-item">Difficulty: {difficulty}</span>
			{/if}
		</div>
	{/if}
	<div class="rf-howto__content">
		{@render children()}
	</div>
</article>
