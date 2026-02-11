<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refract-md/svelte';
	import { Renderer } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	// Extract tab panels from children (sections with heading + content)
	const panels: { name: string; children: RendererNode[] }[] = [];
	let currentPanel: { name: string; children: RendererNode[] } | null = null;

	for (const child of tag.children) {
		if (isTag(child) && /^h[1-6]$/.test(child.name)) {
			if (currentPanel) panels.push(currentPanel);
			const text = child.children.map((c: RendererNode) => typeof c === 'string' ? c : '').join('');
			currentPanel = { name: text, children: [] };
		} else if (currentPanel) {
			currentPanel.children.push(child);
		}
	}
	if (currentPanel) panels.push(currentPanel);

	let activeIndex = $state(0);
</script>

{#if panels.length > 0}
	<div class="tabs">
		<div class="tab-bar" role="tablist">
			{#each panels as panel, i}
				<button
					class="tab-button"
					class:active={i === activeIndex}
					role="tab"
					aria-selected={i === activeIndex}
					onclick={() => activeIndex = i}
				>
					{panel.name}
				</button>
			{/each}
		</div>
		<div class="tab-panels">
			{#each panels as panel, i}
				{#if i === activeIndex}
					<div class="tab-panel" role="tabpanel">
						<Renderer node={panel.children} />
					</div>
				{/if}
			{/each}
		</div>
	</div>
{:else}
	<div class="tabs">
		{@render children()}
	</div>
{/if}

<style>
	.tabs {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		margin: 1.5rem 0;
		background: var(--color-bg);
	}
	.tab-bar {
		display: flex;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	.tab-button {
		flex: 0 0 auto;
		padding: 0.625rem 1.25rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-muted);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: color 200ms ease, border-color 200ms ease, background-color 200ms ease;
		white-space: nowrap;
		margin-bottom: -1px;
		font-family: inherit;
	}
	.tab-button:hover {
		color: var(--color-text);
		background: var(--color-surface-hover);
	}
	.tab-button.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
		background: var(--color-bg);
	}
	.tab-panel {
		padding: 1.25rem 1.5rem;
	}
	.tab-panel :global(pre) {
		margin: 0;
	}
	.tab-panel :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
