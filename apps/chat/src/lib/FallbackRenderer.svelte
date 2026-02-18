<script lang="ts">
	import { Renderer, setRegistry } from '@refrakt-md/svelte';
	import type { RendererNode } from '@refrakt-md/types';

	let { node }: { node: RendererNode } = $props();

	// Override registry with empty map in this component's context scope.
	// All typeof lookups will miss → falls through to generic <svelte:element>
	// (identity-transform-only rendering with BEM classes intact).
	setRegistry({});
</script>

<Renderer {node} />
