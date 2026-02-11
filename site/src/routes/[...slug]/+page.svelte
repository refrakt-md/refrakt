<script lang="ts">
	import { DocsLayout } from '@refract-md/theme-lumina';

	let { data } = $props();
</script>

<DocsLayout
	title={data.title}
	description={data.description}
	regions={data.regions}
	renderable={data.renderable}
	pages={data.pages}
/>
