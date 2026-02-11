<script lang="ts">
	import 'virtual:refract/tokens';

	let { children } = $props();
</script>

<div class="site-layout">
	{@render children()}
</div>

<style>
	.site-layout {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
</style>
