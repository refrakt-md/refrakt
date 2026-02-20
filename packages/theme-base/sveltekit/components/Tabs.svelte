<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = $derived(tag.attributes.typeof);

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
	const { tabs, panels } = $derived.by(() => {
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
		return { tabs, panels };
	});

	let activeIndex = $state(0);
</script>

{#if typeName === 'TabGroup' && tabs.length > 0}
	<div class="rf-tabs">
		<div class="rf-tabs__bar" role="tablist">
			{#each tabs as tab, i}
				<button
					class="rf-tabs__button {i === activeIndex ? 'rf-tabs__button--active' : ''}"
					role="tab"
					aria-selected={i === activeIndex}
					onclick={() => activeIndex = i}
				>
					{tab.name}
				</button>
			{/each}
		</div>
		<div class="rf-tabs__panels">
			{#each panels as panel, i}
				{#if i === activeIndex}
					<div class="rf-tabs__panel" role="tabpanel">
						<Renderer node={panel.children} />
					</div>
				{/if}
			{/each}
		</div>
	</div>
{:else}
	{@render children()}
{/if}
