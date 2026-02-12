<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';
	import { page } from '$app/state';

	interface PageEntry {
		url: string;
		title: string;
		draft: boolean;
	}

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
	const typeName = $derived(tag.attributes.typeof);
	const pages = getContext<PageEntry[]>('pages');

	function getSlug(tag: SerializedTag): string | null {
		for (const child of tag.children) {
			if (isTag(child) && child.name === 'span' && child.attributes.property === 'slug') {
				return getTextContent(child);
			}
		}
		return null;
	}

	function isTag(node: RendererNode): node is SerializedTag {
		return node !== null && typeof node === 'object' && !Array.isArray(node) && (node as any).$$mdtype === 'Tag';
	}

	function getTextContent(node: RendererNode): string {
		if (typeof node === 'string') return node;
		if (typeof node === 'number') return String(node);
		if (isTag(node)) return node.children.map(getTextContent).join('');
		if (Array.isArray(node)) return node.map(getTextContent).join('');
		return '';
	}

	function resolvePage(slug: string): PageEntry | undefined {
		return pages?.find(p => p.url.endsWith('/' + slug) || p.url === '/' + slug);
	}

	const slug = $derived(typeName === 'NavItem' ? getSlug(tag) : null);
	const linkedPage = $derived(slug ? resolvePage(slug) : null);
</script>

{#if typeName === 'Nav'}
	<nav class="site-nav">
		{@render children()}
	</nav>
{:else if typeName === 'NavGroup'}
	<div class="nav-group">
		{@render children()}
	</div>
{:else if typeName === 'NavItem' && linkedPage}
	<a href={linkedPage.url} class="nav-link" class:active={page.url.pathname === linkedPage.url}>
		{linkedPage.title}
	</a>
{:else}
	<div class="nav-item">
		{@render children()}
	</div>
{/if}

<style>
	.site-nav {
		padding: 0.5rem 0;
	}
	.site-nav :global(ul) {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.site-nav :global(li) {
		padding: 0.0625rem 0;
	}
	.nav-group {
		margin-bottom: 1.75rem;
	}
	.nav-group :global(h2),
	.nav-group :global(h3) {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-muted);
		margin-top: 0;
		margin-bottom: 0.5rem;
		padding-left: 0.75rem;
		font-weight: 600;
	}
	.nav-link {
		display: block;
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		text-decoration: none;
		font-size: 0.85rem;
		transition: background-color 150ms ease, color 150ms ease;
	}
	.nav-link:hover {
		background: var(--color-surface);
		color: var(--color-text);
		text-decoration: none;
	}
	.nav-link.active {
		background: var(--color-info-bg);
		color: var(--color-primary);
		font-weight: 600;
	}
	.nav-item {
		padding: 0.375rem 0.75rem;
		font-size: 0.85rem;
		color: var(--color-muted);
	}
</style>
