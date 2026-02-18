<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	const getMeta = (prop: string) => tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
		?.attributes?.content;

	const title: string = getMeta('title') ?? '';
	const width: string = getMeta('width') ?? 'wide';
	const initialTheme: string = getMeta('theme') ?? 'auto';
	const responsiveStr: string = getMeta('responsive') ?? '';

	// Responsive viewport presets
	const VIEWPORT_PRESETS: Record<string, { width: number | null; label: string }> = {
		mobile: { width: 375, label: '375px' },
		tablet: { width: 768, label: '768px' },
		desktop: { width: null, label: 'Full' },
	};

	const responsivePresets = responsiveStr
		? responsiveStr.split(',').map(s => s.trim()).filter(s => s in VIEWPORT_PRESETS)
		: [];
	const hasResponsive = responsivePresets.length > 0;

	// Separate source element from content children
	const { sourceNode, contentChildren } = $derived.by(() => {
		let sourceNode: SerializedTag | null = null;
		const contentChildren: RendererNode[] = [];
		for (const child of tag.children) {
			if (isTag(child) && child.attributes?.property === 'source') {
				sourceNode = child;
			} else if (isTag(child) && child.name === 'meta' && child.attributes?.property) {
				continue;
			} else {
				contentChildren.push(child);
			}
		}
		return { sourceNode, contentChildren };
	});

	// Detect sandbox child for data-source extraction
	const sandboxChild = $derived.by(() => {
		const tags = contentChildren.filter(c => isTag(c) && c.attributes?.typeof === 'Sandbox');
		return tags.length === 1 ? tags[0] as SerializedTag : null;
	});

	// Extract sandbox raw HTML for data-source panel generation
	const sandboxSourcePanels = $derived.by(() => {
		if (!sandboxChild) return null;
		const content = sandboxChild.children
			?.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'content')
			?.attributes?.content;
		if (!content || typeof content !== 'string') return null;

		// Parse data-source markers from the raw HTML using DOMParser (browser only)
		if (typeof DOMParser === 'undefined') return null;
		const parser = new DOMParser();
		const doc = parser.parseFromString(`<body>${content}</body>`, 'text/html');
		const elements = doc.querySelectorAll('[data-source]');
		if (elements.length === 0) return null;

		return Array.from(elements).map(el => {
			const attrVal = el.getAttribute('data-source') || '';
			const tagName = el.tagName.toLowerCase();
			const language = tagName === 'style' ? 'css'
				: tagName === 'script' ? 'javascript'
				: 'html';
			let content: string;
			if (tagName === 'style' || tagName === 'script') {
				content = el.innerHTML.trim();
			} else {
				const clone = el.cloneNode(true) as Element;
				clone.removeAttribute('data-source');
				content = clone.outerHTML;
			}
			return {
				label: attrVal || language.charAt(0).toUpperCase() + language.slice(1),
				language,
				content,
			};
		});
	});

	let themeMode: 'auto' | 'light' | 'dark' = $state(initialTheme as 'auto' | 'light' | 'dark');

	// Expose reactive theme to descendant Sandbox components via context
	setContext('rf-preview-theme', {
		get mode() { return themeMode; }
	});
	let view: 'preview' | 'code' = $state('preview');
	let activeViewport: string | null = $state(
		hasResponsive ? responsivePresets[responsivePresets.length - 1] : null
	);
	let activeSourceTab = $state(0);

	const resolvedTheme = $derived(themeMode === 'auto' ? undefined : themeMode);
	const viewportWidth = $derived(
		activeViewport && VIEWPORT_PRESETS[activeViewport]
			? VIEWPORT_PRESETS[activeViewport].width
			: null
	);

	// Determine effective source: data-source panels override the default sourceNode
	const hasSource = $derived(sourceNode != null || sandboxSourcePanels != null);
</script>

<div class="rf-preview" data-width={width}>
	<div class="rf-preview__toolbar">
		{#if title}
			<span class="rf-preview__title">{title}</span>
		{:else}
			<span></span>
		{/if}
		<div class="rf-preview__controls">
			{#if hasSource}
				<div class="rf-preview__view-toggle">
					<button
						class="rf-preview__toggle-btn"
						class:rf-preview__toggle-btn--active={view === 'preview'}
						onclick={() => view = 'preview'}
						aria-label="Preview"
						title="Preview"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
							<circle cx="12" cy="12" r="3"/>
						</svg>
					</button>
					<button
						class="rf-preview__toggle-btn"
						class:rf-preview__toggle-btn--active={view === 'code'}
						onclick={() => view = 'code'}
						aria-label="View source"
						title="View source"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="16 18 22 12 16 6"/>
							<polyline points="8 6 2 12 8 18"/>
						</svg>
					</button>
				</div>
			{/if}
			{#if hasResponsive}
				<div class="rf-preview__viewport-toggle">
					{#each responsivePresets as preset}
						<button
							class="rf-preview__toggle-btn"
							class:rf-preview__toggle-btn--active={activeViewport === preset}
							onclick={() => activeViewport = preset}
							aria-label="{VIEWPORT_PRESETS[preset].label} viewport"
							title={VIEWPORT_PRESETS[preset].label}
						>
							{#if preset === 'mobile'}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
									<line x1="12" y1="18" x2="12.01" y2="18"/>
								</svg>
							{:else if preset === 'tablet'}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
									<line x1="12" y1="18" x2="12.01" y2="18"/>
								</svg>
							{:else}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
									<line x1="8" y1="21" x2="16" y2="21"/>
									<line x1="12" y1="17" x2="12" y2="21"/>
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
			<div class="rf-preview__toggle">
				<button
					class="rf-preview__toggle-btn"
					class:rf-preview__toggle-btn--active={themeMode === 'auto'}
					onclick={() => themeMode = 'auto'}
					aria-label="System theme"
					title="System preference"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
						<line x1="8" y1="21" x2="16" y2="21"/>
						<line x1="12" y1="17" x2="12" y2="21"/>
					</svg>
				</button>
				<button
					class="rf-preview__toggle-btn"
					class:rf-preview__toggle-btn--active={themeMode === 'light'}
					onclick={() => themeMode = 'light'}
					aria-label="Light theme"
					title="Light mode"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="5"/>
						<line x1="12" y1="1" x2="12" y2="3"/>
						<line x1="12" y1="21" x2="12" y2="23"/>
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
						<line x1="1" y1="12" x2="3" y2="12"/>
						<line x1="21" y1="12" x2="23" y2="12"/>
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
					</svg>
				</button>
				<button
					class="rf-preview__toggle-btn"
					class:rf-preview__toggle-btn--active={themeMode === 'dark'}
					onclick={() => themeMode = 'dark'}
					aria-label="Dark theme"
					title="Dark mode"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
					</svg>
				</button>
			</div>
		</div>
	</div>
	{#if view === 'code' && hasSource}
		<div class="rf-preview__source">
			{#if sandboxSourcePanels}
				{#if sandboxSourcePanels.length > 1}
					<div class="rf-preview__source-tabs">
						{#each sandboxSourcePanels as panel, i}
							<button
								class="rf-preview__source-tab"
								class:rf-preview__source-tab--active={activeSourceTab === i}
								onclick={() => activeSourceTab = i}
							>{panel.label}</button>
						{/each}
					</div>
				{/if}
				<pre data-language={sandboxSourcePanels[activeSourceTab].language}><code data-language={sandboxSourcePanels[activeSourceTab].language}>{sandboxSourcePanels[activeSourceTab].content}</code></pre>
			{:else if sourceNode}
				<Renderer node={sourceNode} />
			{/if}
		</div>
	{:else}
		<div class="rf-preview__canvas" data-theme={resolvedTheme}>
			{#if viewportWidth}
				<div class="rf-preview__viewport-frame" style="max-width: {viewportWidth}px">
					<span class="rf-preview__viewport-label">{VIEWPORT_PRESETS[activeViewport!].label}</span>
					<Renderer node={contentChildren} />
				</div>
			{:else}
				<Renderer node={contentChildren} />
			{/if}
		</div>
	{/if}
</div>
