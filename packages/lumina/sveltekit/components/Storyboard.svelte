<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	const isGroup = $derived(tag.attributes.typeof === 'Storyboard');

	// Style modifier is consumed by engine; read from data attribute
	const styleName = $derived(isGroup
		? tag.attributes['data-style'] || 'clean'
		: 'clean');
	const columns = $derived(isGroup
		? parseInt(tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'columns')?.attributes?.content || '3', 10)
		: 3);

	const panelsEl = $derived(isGroup
		? tag.children.find((c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'panels')
		: undefined);
</script>

{#if isGroup}
	<div class="rf-storyboard rf-storyboard--{styleName}" style="--sb-columns: {columns};">
		<div class="rf-storyboard__panels">
			{#if panelsEl}
				<Renderer node={panelsEl.children} />
			{/if}
		</div>
	</div>
{:else}
	<div class="rf-storyboard-panel">
		<div class="rf-storyboard-panel__body">
			{@render children()}
		</div>
	</div>
{/if}
