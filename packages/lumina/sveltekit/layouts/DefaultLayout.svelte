<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { regions, renderable, url }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		url: string;
		pages: any[];
	} = $props();

	let menuOpen = $state(false);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') menuOpen = false;
	}

	$effect(() => {
		url;
		menuOpen = false;
	});

	// Lock body scroll when panel is open
	$effect(() => {
		document.body.style.overflow = menuOpen ? 'hidden' : '';
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if regions.header}
	<header class="rf-header">
		<div class="rf-header__inner">
			<Renderer node={regions.header.content} />
			<button class="rf-mobile-menu-btn" onclick={() => menuOpen = true} aria-label="Open menu">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<circle cx="10" cy="4" r="1.5"/>
					<circle cx="10" cy="10" r="1.5"/>
					<circle cx="10" cy="16" r="1.5"/>
				</svg>
			</button>
		</div>
	</header>
{/if}

{#if menuOpen}
	<div class="rf-mobile-panel" role="dialog" aria-label="Navigation menu">
		<div class="rf-mobile-panel__header">
			<span class="rf-mobile-panel__title">Menu</span>
			<button class="rf-mobile-panel__close" onclick={() => menuOpen = false} aria-label="Close menu">
				<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
					<line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
				</svg>
			</button>
		</div>
		<nav class="rf-mobile-panel__nav">
			{#if regions.header}
				<Renderer node={regions.header.content} />
			{/if}
		</nav>
	</div>
{/if}

<main class="rf-page-content">
	<Renderer node={renderable} />
</main>
