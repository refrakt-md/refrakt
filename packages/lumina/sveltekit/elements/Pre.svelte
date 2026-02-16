<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isCodeBlock = 'data-language' in (tag.attributes || {});

	let preEl: HTMLPreElement;
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	function copy() {
		const text = preEl.textContent ?? '';
		navigator.clipboard.writeText(text);
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => copied = false, 2000);
	}
</script>

{#if isCodeBlock}
	<div class="rf-codeblock">
		<pre bind:this={preEl} {...tag.attributes}>{@render children()}</pre>
		<button class="rf-codeblock__copy" class:rf-codeblock__copy--copied={copied} onclick={copy} aria-label="Copy code">
			{#if copied}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12" />
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
			{/if}
		</button>
	</div>
{:else}
	<pre {...tag.attributes}>{@render children()}</pre>
{/if}

<style>
	.rf-codeblock {
		position: relative;
	}
	.rf-codeblock :global(pre) {
		margin: 0;
	}
	.rf-codeblock__copy {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: var(--rf-radius-sm);
		background: transparent;
		color: var(--rf-color-code-text, #e2e8f0);
		cursor: pointer;
		opacity: 0;
		transition: opacity 150ms ease, background-color 150ms ease;
	}
	.rf-codeblock:hover .rf-codeblock__copy {
		opacity: 0.6;
	}
	.rf-codeblock__copy:hover {
		opacity: 1 !important;
		background: rgba(255, 255, 255, 0.1);
	}
	.rf-codeblock__copy--copied {
		opacity: 1 !important;
		color: var(--rf-color-success, #4ade80);
	}
</style>
