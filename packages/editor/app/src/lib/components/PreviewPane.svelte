<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import { fetchPreviewHtml, fetchPreviewData } from '../api/client.js';

	let { onnavigate }: { onnavigate?: (path: string) => void } = $props();

	let previewHtml = $state('');
	let previewIframe: HTMLIFrameElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;
	let pageMap: Map<string, string> = new Map(); // url → file path

	// Viewport presets
	type Viewport = 'desktop' | 'tablet' | 'mobile';
	let viewport: Viewport = $state('desktop');

	const VIEWPORTS: Record<Viewport, { label: string; width: number | null }> = {
		desktop: { label: 'Desktop', width: null },
		tablet: { label: 'Tablet', width: 768 },
		mobile: { label: 'Mobile', width: 375 },
	};

	const constrained = $derived(viewport !== 'desktop');
	const viewportWidth = $derived(VIEWPORTS[viewport].width);

	// Listen for messages from the preview runtime iframe
	$effect(() => {
		function onMessage(e: MessageEvent) {
			if (e.data?.type === 'preview-ready') {
				editorState.previewRuntimeReady = true;
			} else if (e.data?.type === 'preview-navigate') {
				const href = e.data.href as string;
				const filePath = pageMap.get(href);
				if (filePath && onnavigate) onnavigate(filePath);
			}
		}
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	// Determine which mode to use
	const useRuntime = $derived(
		editorState.previewRuntimeAvailable && editorState.previewRuntimeReady,
	);

	// Main preview effect — debounces content changes
	$effect(() => {
		const path = editorState.currentPath;
		const content = editorState.editorContent;
		// Read useRuntime to re-trigger when mode changes
		const runtime = useRuntime;
		if (!path || !content) {
			previewHtml = '';
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				if (runtime) {
					// Svelte preview runtime — send data via postMessage
					const data = await fetchPreviewData(path, content) as any;
					if (data.pages) {
						pageMap = new Map(data.pages.map((p: any) => [p.url, p.path]));
					}
					previewIframe?.contentWindow?.postMessage(
						{ type: 'preview-update', page: data },
						'*',
					);
				} else {
					// HTML fallback — use srcdoc
					previewHtml = await fetchPreviewHtml(path, content);
				}
			} catch {
				// Ignore preview errors during typing
			}
		}, 400);

		return () => clearTimeout(debounceTimer);
	});
</script>

{#if !editorState.currentPath}
	<div class="preview__empty">
		<span class="preview__empty-text">Select a page to preview</span>
	</div>
{:else}
	<div class="preview__toolbar">
		{#each Object.entries(VIEWPORTS) as [key, preset]}
			<button
				class="preview__device"
				class:preview__device--active={viewport === key}
				onclick={() => viewport = key as Viewport}
				title={preset.label}
			>
				{#if key === 'desktop'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="1.5" y="2" width="13" height="9" rx="1" />
						<line x1="5.5" y1="14" x2="10.5" y2="14" />
						<line x1="8" y1="11" x2="8" y2="14" />
					</svg>
				{:else if key === 'tablet'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="1.5" width="10" height="13" rx="1.5" />
						<line x1="7" y1="12.5" x2="9" y2="12.5" />
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="4" y="1.5" width="8" height="13" rx="2" />
						<line x1="7" y1="12.5" x2="9" y2="12.5" />
					</svg>
				{/if}
				<span class="preview__device-label">{preset.label}</span>
			</button>
		{/each}
		{#if constrained}
			<span class="preview__dimensions">{viewportWidth}px</span>
		{/if}
	</div>

	<div class="preview__viewport" class:preview__viewport--constrained={constrained}>
		{#if editorState.previewRuntimeAvailable}
			<iframe
				bind:this={previewIframe}
				title="Preview"
				src="/preview/"
				class="preview__iframe"
				class:preview__iframe--constrained={constrained}
				style={constrained ? `width: ${viewportWidth}px; max-width: 100%;` : ''}
			></iframe>
		{:else}
			<iframe
				title="Preview"
				srcdoc={previewHtml}
				class="preview__iframe"
				class:preview__iframe--constrained={constrained}
				style={constrained ? `width: ${viewportWidth}px; max-width: 100%;` : ''}
			></iframe>
		{/if}
	</div>
{/if}

<style>
	.preview__toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 0 0.5rem;
		height: 32px;
		background: #ffffff;
		border-bottom: 1px solid #e2e8f0;
		flex-shrink: 0;
	}

	.preview__device {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.5rem;
		border: none;
		border-radius: 5px;
		background: transparent;
		color: #94a3b8;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.preview__device:hover {
		background: #f1f5f9;
		color: #64748b;
	}

	.preview__device--active {
		background: #f1f5f9;
		color: #0ea5e9;
	}

	.preview__device--active:hover {
		color: #0ea5e9;
	}

	.preview__device-label {
		font-family: system-ui, -apple-system, sans-serif;
	}

	.preview__dimensions {
		margin-left: auto;
		font-size: 0.7rem;
		color: #94a3b8;
		font-family: ui-monospace, monospace;
	}

	.preview__viewport {
		flex: 1;
		overflow: hidden;
		background: #ffffff;
	}

	.preview__viewport--constrained {
		display: flex;
		justify-content: center;
		background: #f1f5f9;
		padding: 1rem;
	}

	.preview__iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: #ffffff;
	}

	.preview__iframe--constrained {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}

	.preview__empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: #ffffff;
	}

	.preview__empty-text {
		color: #94a3b8;
		font-size: 0.9rem;
	}
</style>
