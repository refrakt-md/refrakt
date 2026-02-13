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
	<nav class="rf-nav">
		{@render children()}
	</nav>
{:else if typeName === 'NavGroup'}
	<div class="rf-nav-group">
		{@render children()}
	</div>
{:else if typeName === 'NavItem' && linkedPage}
	<a href={linkedPage.url} class="rf-nav-item__link" class:rf-nav-item__link--active={page.url.pathname === linkedPage.url}>
		{linkedPage.title}
	</a>
{:else}
	<div class="rf-nav-item">
		{@render children()}
	</div>
{/if}
