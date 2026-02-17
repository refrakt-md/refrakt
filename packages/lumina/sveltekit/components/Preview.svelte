<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
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

	let themeMode: 'auto' | 'light' | 'dark' = $state(initialTheme as 'auto' | 'light' | 'dark');
	let view: 'preview' | 'code' = $state('preview');

	const resolvedTheme = $derived(themeMode === 'auto' ? undefined : themeMode);
</script>

<div class="rf-preview" data-width={width}>
	<div class="rf-preview__toolbar">
		{#if title}
			<span class="rf-preview__title">{title}</span>
		{:else}
			<span></span>
		{/if}
		<div class="rf-preview__controls">
			{#if sourceNode}
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
	{#if view === 'code' && sourceNode}
		<div class="rf-preview__source">
			<Renderer node={sourceNode} />
		</div>
	{:else}
		<div class="rf-preview__canvas" data-theme={resolvedTheme}>
			<Renderer node={contentChildren} />
		</div>
	{/if}
</div>
