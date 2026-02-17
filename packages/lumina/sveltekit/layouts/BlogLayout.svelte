<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { title, frontmatter, regions, renderable, pages, url }: {
		title: string;
		description: string;
		frontmatter?: Record<string, unknown>;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: Array<{
			url: string;
			title: string;
			draft: boolean;
			description?: string;
			date?: string;
			author?: string;
			tags?: string[];
			image?: string;
		}>;
		url: string;
	} = $props();

	const date = $derived(frontmatter?.date as string | undefined);
	const author = $derived(frontmatter?.author as string | undefined);
	const tags = $derived(frontmatter?.tags as string[] | undefined);

	// Index page has no date; individual posts always have one
	const isIndex = $derived(!date);

	const posts = $derived(
		isIndex
			? pages
				.filter(p => p.url.startsWith('/blog/') && p.url !== '/blog' && !p.draft && p.date)
				.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
			: []
	);

	const hasSidebar = $derived(!!regions.sidebar);

	let menuOpen = $state(false);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') menuOpen = false;
	}

	$effect(() => {
		url;
		menuOpen = false;
	});

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if regions.header}
	<header class="site-header">
		<div class="site-header-inner">
			<Renderer node={regions.header.content} />
			<button class="mobile-menu-btn" onclick={() => menuOpen = true} aria-label="Open menu">
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
	<div class="mobile-panel" role="dialog" aria-label="Navigation menu">
		<div class="mobile-panel-header">
			<span class="mobile-panel-title">Menu</span>
			<button class="mobile-panel-close" onclick={() => menuOpen = false} aria-label="Close menu">
				<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
					<line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
				</svg>
			</button>
		</div>
		<nav class="mobile-panel-nav">
			{#if regions.header}
				<Renderer node={regions.header.content} />
			{/if}
		</nav>
	</div>
{/if}

<div class="blog-layout" class:has-sidebar={hasSidebar}>
	{#if isIndex}
		<div class="blog-index">
			<h1 class="blog-index-title">{title}</h1>

			<div class="blog-index-body">
				<Renderer node={renderable} />
			</div>

			<div class="blog-index-posts">
				{#each posts as post}
					<a href={post.url} class="blog-post-card">
						<h2 class="blog-post-card-title">{post.title}</h2>
						<div class="blog-post-card-meta">
							{#if post.date}
								<time datetime={post.date}>{formatDate(post.date)}</time>
							{/if}
							{#if post.author}
								<span class="blog-post-card-author">{post.author}</span>
							{/if}
						</div>
						{#if post.description}
							<p class="blog-post-card-desc">{post.description}</p>
						{/if}
						{#if post.tags && post.tags.length > 0}
							<div class="blog-post-card-tags">
								{#each post.tags as tag}
									<span class="blog-article-tag">{tag}</span>
								{/each}
							</div>
						{/if}
						<span class="blog-post-card-link">Read more &rarr;</span>
					</a>
				{/each}
			</div>
		</div>
	{:else}
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
	{/if}
</div>

{#if regions.footer}
	<footer class="site-footer">
		<Renderer node={regions.footer.content} />
	</footer>
{/if}

<style>
	/* ---- Site header ---- */
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

	/* ---- Mobile menu button ---- */
	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-muted);
		line-height: 0;
	}
	.mobile-menu-btn:hover {
		color: var(--color-text);
	}

	/* ---- Mobile panel ---- */
	.mobile-panel {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--color-bg, #fff);
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.mobile-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.mobile-panel-title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
	}
	.mobile-panel-close {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-muted);
		line-height: 0;
	}
	.mobile-panel-close:hover {
		color: var(--color-text);
	}
	.mobile-panel-nav {
		padding: 1.5rem;
	}
	.mobile-panel-nav :global(p) {
		margin: 0;
	}
	.mobile-panel-nav :global(img) {
		display: none;
	}
	.mobile-panel-nav :global(a) {
		display: block;
		padding: 0.75rem 0;
		font-size: 1.1rem;
		color: var(--color-text);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border);
	}
	.mobile-panel-nav :global(a:hover) {
		color: var(--color-primary, var(--color-text));
		text-decoration: none;
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

	/* ---- Blog index ---- */
	.blog-index {
		max-width: 42rem;
	}
	.blog-index-title {
		font-size: 2.25rem;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.02em;
		margin: 0 0 1rem;
		color: var(--color-text);
	}
	.blog-index-body {
		margin-bottom: 2rem;
		line-height: 1.8;
		color: var(--color-muted);
	}
	.blog-index-body:empty {
		display: none;
	}
	.blog-index-posts {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ---- Post card ---- */
	.blog-post-card {
		display: block;
		padding: 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.blog-post-card:hover {
		border-color: var(--color-text);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		text-decoration: none;
	}
	.blog-post-card-title {
		font-size: 1.35rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		color: var(--color-text);
	}
	.blog-post-card-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: var(--color-muted);
		margin-bottom: 0.5rem;
	}
	.blog-post-card-author::before {
		content: '\00b7';
		margin-right: 0.75rem;
	}
	.blog-post-card-desc {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.blog-post-card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.blog-post-card-link {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-primary, var(--color-text));
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
		.site-header-inner :global(p:last-child:not(:first-child)) {
			display: none;
		}
		.mobile-menu-btn {
			display: block;
		}
		.mobile-panel {
			display: block;
		}
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
