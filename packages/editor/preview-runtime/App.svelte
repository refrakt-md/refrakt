<script lang="ts">
	import { ThemeShell } from '@refrakt-md/svelte';
	import { theme } from 'virtual:refrakt-theme';

	let pageData: any = $state(null);

	// Listen for preview data from parent editor
	$effect(() => {
		function onMessage(e: MessageEvent) {
			if (e.data?.type === 'preview-update') {
				pageData = e.data.page;
			}
		}
		window.addEventListener('message', onMessage);
		// Signal to parent that we're ready to receive data
		window.parent.postMessage({ type: 'preview-ready' }, '*');
		return () => window.removeEventListener('message', onMessage);
	});

	// Intercept link clicks to prevent iframe navigation
	$effect(() => {
		function onClick(e: MouseEvent) {
			const a = (e.target as HTMLElement).closest('a');
			if (!a) return;
			const href = a.getAttribute('href');
			if (!href || href.startsWith('#')) return;
			e.preventDefault();
			window.parent.postMessage({ type: 'preview-navigate', href }, '*');
		}
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});
</script>

{#if pageData}
	<ThemeShell {theme} page={pageData} />
{:else}
	<div class="preview-loading">Loading preview...</div>
{/if}

<style>
	.preview-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		color: #94a3b8;
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 0.9rem;
	}
</style>
