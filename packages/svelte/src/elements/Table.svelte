<script lang="ts">
	import type { SerializedTag } from '../types.js';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<div class="rf-table-wrapper">
	<table {...tag.attributes}>
		{@render children()}
	</table>
</div>
