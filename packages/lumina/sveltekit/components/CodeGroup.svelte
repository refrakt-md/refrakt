<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

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

	const title = $derived.by(() => {
		for (const child of tag.children) {
			if (isTag(child) && child.attributes?.property === 'title') {
				return getTextContent(child);
			}
		}
		return '';
	});

	const { tabs, panels } = $derived.by(() => {
		const tabs: { name: string }[] = [];
		const panels: { children: RendererNode[] }[] = [];
		for (const child of tag.children) {
			if (!isTag(child) || child.name !== 'ul') continue;
			for (const item of child.children) {
				if (!isTag(item)) continue;
				if (item.attributes?.typeof === 'Tab') {
					const nameNode = item.children.find(
						(c): c is SerializedTag => isTag(c) && c.attributes?.property === 'name'
					);
					tabs.push({ name: (nameNode ? getTextContent(nameNode) : getTextContent(item)).trim() });
				} else if (item.attributes?.typeof === 'TabPanel') {
					panels.push({ children: item.children });
				}
			}
		}
		return { tabs, panels };
	});

	let activeIndex = $state(0);
</script>

{#if tabs.length > 0}
	<div class="rf-codegroup">
		<div class="rf-codegroup__topbar">
			<span class="rf-codegroup__dot"></span>
			<span class="rf-codegroup__dot"></span>
			<span class="rf-codegroup__dot"></span>
			{#if title}
				<span class="rf-codegroup__title">{title}</span>
			{/if}
		</div>
		{#if tabs.length > 1}
			<div class="rf-codegroup__tabs" role="tablist">
				{#each tabs as tab, i}
					<button
						class="rf-codegroup__tab {i === activeIndex ? 'rf-codegroup__tab--active' : ''}"
						role="tab"
						aria-selected={i === activeIndex}
						onclick={() => activeIndex = i}
					>
						{tab.name}
					</button>
				{/each}
			</div>
		{/if}
		<div class="rf-codegroup__content">
			{#each panels as panel, i}
				{#if i === activeIndex}
					<div class="rf-codegroup__panel" role="tabpanel">
						<Renderer node={panel.children} />
					</div>
				{/if}
			{/each}
		</div>
	</div>
{:else}
	{@render children()}
{/if}
