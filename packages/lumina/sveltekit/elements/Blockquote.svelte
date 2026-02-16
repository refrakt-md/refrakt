<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<blockquote class="themed-blockquote">
	<svg class="quote-mark" width="24" height="24" viewBox="0 0 24 24" fill="none">
		<path d="M10 8C10 5.79 8.21 4 6 4C3.79 4 2 5.79 2 8C2 10.21 3.79 12 6 12C6.67 12 7.31 11.83 7.88 11.54C7.63 14.08 5.55 16.09 3 16.34V18.36C6.68 18.09 9.64 15.13 9.93 11.45C9.98 10.99 10 10.5 10 10V8ZM22 8C22 5.79 20.21 4 18 4C15.79 4 14 5.79 14 8C14 10.21 15.79 12 18 12C18.67 12 19.31 11.83 19.88 11.54C19.63 14.08 17.55 16.09 15 16.34V18.36C18.68 18.09 21.64 15.13 21.93 11.45C21.98 10.99 22 10.5 22 10V8Z" fill="currentColor"/>
	</svg>
	{@render children()}
</blockquote>

<style>
	.themed-blockquote {
		position: relative;
		border-left: 3px solid var(--color-primary);
		margin: 1.5rem 0;
		padding: 1rem 1.25rem 1rem 2.75rem;
		color: var(--color-muted);
		background: var(--color-surface);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}
	.quote-mark {
		position: absolute;
		left: 0.75rem;
		top: 1rem;
		width: 18px;
		height: 18px;
		color: var(--color-primary);
		opacity: 0.4;
	}
	.themed-blockquote :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
