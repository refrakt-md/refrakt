<script lang="ts">
	import { setContext } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';
	import type { DesignTokens } from '@refrakt-md/types';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const getMeta = (prop: string) => tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
		?.attributes?.content;

	const tokensJson = $derived(getMeta('tokens') || '{}');
	const tokens = $derived<DesignTokens>(JSON.parse(tokensJson));

	setContext('rf-design-tokens', {
		get tokens() { return tokens; },
	});
</script>

<section class="rf-design-context">
	{@render children()}
</section>
