<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { title, frontmatter, regions, renderable }: {
		title: string;
		description: string;
		frontmatter?: Record<string, unknown>;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: any[];
	} = $props();

	const date = frontmatter?.date as string | undefined;
	const author = frontmatter?.author as string | undefined;
	const tags = frontmatter?.tags as string[] | undefined;

	const hasSidebar = $derived(!!regions.sidebar);

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

{#if regions.header}
	<header class="site-header">
		<div class="site-header-inner">
			<Renderer node={regions.header.content} />
		</div>
	</header>
{/if}

<div class="blog-layout" class:has-sidebar={hasSidebar}>
	<article class="blog-article">
		<header class="blog-article-header">
			<h1 class="blog-article-title">{title}</h1>
			{#if date || author}
				<div class="blog-article-meta">
					{#if date}
						<time datetime={date}>{formatDate(date)}</time>
					{/if}
					{#if author}
						<span class="blog-article-author">{author}</span>
					{/if}
				</div>
			{/if}
			{#if tags && tags.length > 0}
				<div class="blog-article-tags">
					{#each tags as tag}
						<span class="blog-article-tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</header>

		<div class="blog-article-body">
			<Renderer node={renderable} />
		</div>
	</article>

	{#if regions.sidebar}
		<aside class="blog-sidebar">
			<Renderer node={regions.sidebar.content} />
		</aside>
	{/if}
</div>

{#if regions.footer}
	<footer class="site-footer">
		<Renderer node={regions.footer.content} />
	</footer>
{/if}

<style>
	/* ---- Site header (shared with other layouts) ---- */
	.site-header {
		border-bottom: 1px solid var(--color-border);
	}
	.site-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
	}
	.site-header :global(p) {
		margin: 0;
		line-height: 1;
	}
	.site-header :global(a) {
		display: inline-block;
		color: inherit;
		text-decoration: none;
	}
	.site-header :global(a:hover) {
		text-decoration: none;
	}
	.site-header :global(img) {
		display: block;
		height: 1.5rem;
		width: auto;
	}
	.site-header-inner :global(p:last-child:not(:first-child)) {
		font-size: 0.85rem;
	}
	.site-header-inner :global(p:last-child:not(:first-child) a) {
		margin-left: 1.5rem;
		color: var(--color-muted);
	}
	.site-header-inner :global(p:last-child:not(:first-child) a:hover) {
		color: var(--color-text);
	}

	/* ---- Blog layout ---- */
	.blog-layout {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 4rem;
	}
	.blog-layout.has-sidebar {
		display: grid;
		grid-template-columns: 1fr 16rem;
		gap: 3rem;
		align-items: start;
	}

	/* ---- Article ---- */
	.blog-article {
		max-width: 42rem;
	}
	.blog-article-header {
		margin-bottom: 2.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.blog-article-title {
		font-size: 2.25rem;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.02em;
		margin: 0 0 1rem;
		color: var(--color-text);
	}
	.blog-article-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	.blog-article-meta time {
		font-weight: 500;
	}
	.blog-article-author::before {
		content: '\00b7';
		margin-right: 0.75rem;
	}
	.blog-article-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.blog-article-tag {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: var(--color-surface);
		color: var(--color-muted);
		border: 1px solid var(--color-border);
	}

	/* ---- Article body typography ---- */
	.blog-article-body {
		line-height: 1.8;
	}
	.blog-article-body :global(h2) {
		margin-top: 2.5rem;
	}
	.blog-article-body :global(h3) {
		margin-top: 2rem;
	}
	.blog-article-body :global(p) {
		margin-bottom: 1.25rem;
	}
	.blog-article-body :global(img) {
		border-radius: var(--radius-md);
		margin: 1.5rem 0;
	}

	/* ---- Sidebar ---- */
	.blog-sidebar {
		position: sticky;
		top: 2.5rem;
		font-size: 0.85rem;
		color: var(--color-muted);
	}
	.blog-sidebar :global(h2),
	.blog-sidebar :global(h3),
	.blog-sidebar :global(h4) {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		margin-top: 0;
		margin-bottom: 0.5rem;
	}
	.blog-sidebar :global(ul) {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.blog-sidebar :global(li) {
		padding: 0.25rem 0;
	}
	.blog-sidebar :global(a) {
		color: var(--color-muted);
		text-decoration: none;
	}
	.blog-sidebar :global(a:hover) {
		color: var(--color-text);
	}

	/* ---- Footer ---- */
	.site-footer {
		border-top: 1px solid var(--color-border);
		padding: 2rem 1.5rem;
		text-align: center;
		font-size: 0.85rem;
		color: var(--color-muted);
	}

	/* ---- Mobile ---- */
	@media (max-width: 768px) {
		.blog-layout.has-sidebar {
			grid-template-columns: 1fr;
		}
		.blog-article-title {
			font-size: 1.75rem;
		}
		.blog-sidebar {
			position: static;
			border-top: 1px solid var(--color-border);
			padding-top: 1.5rem;
		}
	}
</style>
