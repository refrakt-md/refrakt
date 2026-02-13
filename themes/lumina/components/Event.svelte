<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const date = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'date')?.attributes?.content || '';
	const endDate = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'endDate')?.attributes?.content || '';
	const location = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'location')?.attributes?.content || '';
	const url = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'url')?.attributes?.content || '';
</script>

<article class="rf-event" typeof="Event">
	<div class="rf-event__details">
		{#if date}
			<div class="rf-event__detail">
				<span class="rf-event__label">Date</span>
				<span class="rf-event__value">{date}{#if endDate} — {endDate}{/if}</span>
			</div>
		{/if}
		{#if location}
			<div class="rf-event__detail">
				<span class="rf-event__label">Location</span>
				<span class="rf-event__value">{location}</span>
			</div>
		{/if}
		{#if url}
			<div class="rf-event__detail">
				<a href={url} class="rf-event__register">Register</a>
			</div>
		{/if}
	</div>
	<div class="rf-event__content">
		{@render children()}
	</div>
</article>
