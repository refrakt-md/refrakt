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

	// Lock body scroll when panel is open
	$effect(() => {
		document.body.style.overflow = menuOpen ? 'hidden' : '';
	});

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if regions.header}
	<header class="rf-blog-header">
		<div class="rf-blog-header__inner">
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

<div class="rf-blog" class:rf-blog--has-sidebar={hasSidebar}>
	{#if isIndex}
		<div class="rf-blog-index">
			<h1 class="rf-blog-index__title">{title}</h1>

			<div class="rf-blog-index__body">
				<Renderer node={renderable} />
			</div>

			<div class="rf-blog-index__posts">
				{#each posts as post}
					<a href={post.url} class="rf-blog-card">
						<h2 class="rf-blog-card__title">{post.title}</h2>
						<div class="rf-blog-card__meta">
							{#if post.date}
								<time datetime={post.date}>{formatDate(post.date)}</time>
							{/if}
							{#if post.author}
								<span class="rf-blog-card__author">{post.author}</span>
							{/if}
						</div>
						{#if post.description}
							<p class="rf-blog-card__desc">{post.description}</p>
						{/if}
						{#if post.tags && post.tags.length > 0}
							<div class="rf-blog-card__tags">
								{#each post.tags as tag}
									<span class="rf-blog-article__tag">{tag}</span>
								{/each}
							</div>
						{/if}
						<span class="rf-blog-card__link">Read more &rarr;</span>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<article class="rf-blog-article">
			<header class="rf-blog-article__header">
				<h1 class="rf-blog-article__title">{title}</h1>
				{#if date || author}
					<div class="rf-blog-article__meta">
						{#if date}
							<time datetime={date}>{formatDate(date)}</time>
						{/if}
						{#if author}
							<span class="rf-blog-article__author">{author}</span>
						{/if}
					</div>
				{/if}
				{#if tags && tags.length > 0}
					<div class="rf-blog-article__tags">
						{#each tags as tag}
							<span class="rf-blog-article__tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</header>

			<div class="rf-blog-article__body">
				<Renderer node={renderable} />
			</div>
		</article>

		{#if regions.sidebar}
			<aside class="rf-blog-sidebar">
				<Renderer node={regions.sidebar.content} />
			</aside>
		{/if}
	{/if}
</div>

{#if regions.footer}
	<footer class="rf-blog-footer">
		<Renderer node={regions.footer.content} />
	</footer>
{/if}
