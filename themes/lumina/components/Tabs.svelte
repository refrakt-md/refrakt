<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = tag.attributes.typeof;

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	function getTextContent(node: RendererNode): string {
		if (typeof node === 'string') return node;
		if (typeof node === 'number') return String(node);
		if (isTag(node)) return node.children.map(getTextContent).join('');
		if (Array.isArray(node)) return node.map(getTextContent).join('');
		return '';
	}

	// For TabGroup: parse the ul/li structure from the transform
	const tabs: { name: string }[] = [];
	const panels: { children: RendererNode[] }[] = [];

	if (typeName === 'TabGroup') {
		for (const child of tag.children) {
			if (!isTag(child) || child.name !== 'ul') continue;
			for (const item of child.children) {
				if (!isTag(item)) continue;
				if (item.attributes?.typeof === 'Tab') {
					const nameNode = item.children.find(
						(c): c is SerializedTag => isTag(c) && c.attributes?.property === 'name'
					);
					const name = nameNode ? getTextContent(nameNode) : getTextContent(item);
					tabs.push({ name: name.trim() });
				} else if (item.attributes?.typeof === 'TabPanel') {
					panels.push({ children: item.children });
				}
			}
		}
	}

	let activeIndex = $state(0);
</script>

{#if typeName === 'TabGroup' && tabs.length > 0}
	<div class="tabs">
		<div class="tab-bar" role="tablist">
			{#each tabs as tab, i}
				<button
					class="tab-button"
					class:active={i === activeIndex}
					role="tab"
					aria-selected={i === activeIndex}
					onclick={() => activeIndex = i}
				>
					{tab.name}
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
	{@render children()}
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
