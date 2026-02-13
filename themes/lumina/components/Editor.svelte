<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<div class="rf-editor">
	<div class="rf-editor__topbar">
		<span class="rf-editor__dot" style="background: #ef4444;"></span>
		<span class="rf-editor__dot" style="background: #f59e0b;"></span>
		<span class="rf-editor__dot" style="background: #22c55e;"></span>
	</div>
	<div class="rf-editor__content">
		{@render children()}
	</div>
</div>
