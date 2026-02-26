<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import { fetchPreviewHtml, fetchPreviewData } from '../api/client.js';

	let { onnavigate }: { onnavigate?: (path: string) => void } = $props();

	let previewHtml = $state('');
	let previewIframe: HTMLIFrameElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;
	let pageMap: Map<string, string> = new Map(); // url → file path
	let loading = $state(false);

	// Viewport presets
	const VIEWPORT_WIDTHS: Record<string, number | null> = {
		desktop: null,
		tablet: 768,
		mobile: 375,
	};

	const constrained = $derived(editorState.viewport !== 'desktop');
	const viewportWidth = $derived(VIEWPORT_WIDTHS[editorState.viewport]);

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

		loading = true;
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
			} finally {
				loading = false;
			}
		}, 400);

		return () => clearTimeout(debounceTimer);
	});
</script>

{#if !editorState.currentPath}
	<div class="preview__empty">
		<svg class="preview__empty-icon" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<rect x="4" y="8" width="40" height="32" rx="3" />
			<line x1="4" y1="16" x2="44" y2="16" />
			<circle cx="10" cy="12" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="20" cy="12" r="1.5" fill="currentColor" stroke="none" />
			<line x1="14" y1="26" x2="34" y2="26" />
			<line x1="14" y1="32" x2="28" y2="32" />
		</svg>
		<span class="preview__empty-text">Select a page to preview</span>
	</div>
{:else}
	<div class="preview__container">
		<div class="preview__header">
			<span class="preview__header-label">Preview</span>
			{#if loading}
				<span class="preview__header-status">Updating...</span>
			{/if}
		</div>
		{#if loading}
			<div class="preview__progress"></div>
		{/if}
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
	</div>
{/if}

<style>
	.preview__container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.preview__header {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2);
		padding: var(--ed-space-1) var(--ed-space-3);
		background: var(--ed-surface-1);
		border-bottom: 1px solid var(--ed-border-default);
		flex-shrink: 0;
		height: 28px;
	}

	.preview__header-label {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-muted);
	}

	.preview__header-status {
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		margin-left: auto;
	}

	/* Indeterminate progress bar */
	.preview__progress {
		height: 2px;
		background: var(--ed-surface-2);
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

	.preview__progress::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 30%;
		background: var(--ed-accent);
		animation: progress-slide 1s ease-in-out infinite;
	}

	@keyframes progress-slide {
		0% { left: -30%; }
		100% { left: 100%; }
	}

	.preview__viewport {
		flex: 1;
		overflow: hidden;
	}

	.preview__viewport--constrained {
		display: flex;
		justify-content: center;
		padding: var(--ed-space-4);
		background: var(--ed-surface-1);
	}

	.preview__iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: var(--ed-surface-0);
	}

	.preview__iframe--constrained {
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-lg);
		box-shadow: var(--ed-shadow-md);
	}

	/* Empty state */
	.preview__empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: var(--ed-surface-1);
		gap: var(--ed-space-3);
	}

	.preview__empty-icon {
		color: var(--ed-border-strong);
	}

	.preview__empty-text {
		color: var(--ed-text-muted);
		font-size: var(--ed-text-md);
	}
</style>
