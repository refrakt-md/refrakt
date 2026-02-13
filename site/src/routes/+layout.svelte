<script lang="ts">
	import 'virtual:refrakt/tokens';

	let { children } = $props();
</script>

<div class="site-layout">
	{@render children()}
</div>

<style>
	.site-layout {
		/* Layouts handle their own width constraints */
	}
</style>
