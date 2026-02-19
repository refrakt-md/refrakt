<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorState } from '@codemirror/state';
	import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
	import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
	import SafeRenderer from './SafeRenderer.svelte';
	import { renderMarkdocSafe } from './pipeline.js';
	import type { RendererNode } from '@refrakt-md/types';

	interface Props {
		source: string;
		onchange: (newSource: string) => void;
		onclose: () => void;
	}

	let { source, onchange, onclose }: Props = $props();

	let editorContainer: HTMLElement;
	let editorView: EditorView;
	let previewNode = $state<RendererNode | null>(null);
	let renderError = $state<string | null>(null);

	let renderTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleRender(doc: string) {
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			try {
				const result = renderMarkdocSafe(doc);
				previewNode = result.renderable;
				renderError = null;
			} catch (err) {
				renderError = err instanceof Error ? err.message : String(err);
			}
		}, 300);
	}

	const editorTheme = EditorView.theme({
		'&': {
			fontSize: '0.8125rem',
			maxHeight: '300px',
		},
		'.cm-scroller': {
			overflow: 'auto',
			fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
		},
		'.cm-content': {
			padding: '0.5rem 0',
		},
		'.cm-gutters': {
			background: 'var(--rf-color-surface-alt, #f8fafc)',
			border: 'none',
			color: 'var(--rf-color-text-muted, #94a3b8)',
		},
		'.cm-activeLineGutter': {
			background: 'var(--rf-color-border, #e2e8f0)',
		},
		'.cm-activeLine': {
			background: 'rgba(0, 0, 0, 0.03)',
		},
		'.cm-cursor': {
			borderLeftColor: 'var(--rf-color-text, #1e293b)',
		},
		'&.cm-focused .cm-selectionBackground, ::selection': {
			background: 'rgba(14, 165, 233, 0.15)',
		},
	});

	onMount(() => {
		const state = EditorState.create({
			doc: source,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				markdown(),
				syntaxHighlighting(defaultHighlightStyle),
				highlightSelectionMatches(),
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					...searchKeymap,
					{ key: 'Escape', run: () => { onclose(); return true; } },
				]),
				editorTheme,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const doc = update.state.doc.toString();
						onchange(doc);
						scheduleRender(doc);
					}
				}),
			],
		});

		editorView = new EditorView({
			state,
			parent: editorContainer,
		});

		// Initial preview render
		scheduleRender(source);

		// Focus editor
		editorView.focus();
	});

	onDestroy(() => {
		if (renderTimer) clearTimeout(renderTimer);
		editorView?.destroy();
	});
</script>

<div class="source-editor">
	<div class="source-editor__toolbar">
		<span class="source-editor__label">Source</span>
		<button class="source-editor__close" onclick={onclose} title="Close editor (Esc)">
			&times;
		</button>
	</div>
	<div class="source-editor__cm" bind:this={editorContainer}></div>
	<div class="source-editor__preview-label">Preview</div>
	<div class="source-editor__preview">
		{#if renderError}
			<p class="source-editor__error">{renderError}</p>
		{:else if previewNode}
			<SafeRenderer node={previewNode} inProgressBlocks={[]} />
		{:else}
			<p class="source-editor__empty">Type Markdoc to see a preview</p>
		{/if}
	</div>
</div>

<style>
	.source-editor {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 0.75rem;
		background: var(--rf-color-surface, #ffffff);
	}

	.source-editor__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.75rem;
		background: var(--rf-color-surface-alt, #f8fafc);
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.source-editor__label,
	.source-editor__preview-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--rf-color-text-muted, #94a3b8);
	}

	.source-editor__preview-label {
		padding: 0.375rem 0.75rem;
		border-top: 1px solid var(--rf-color-border, #e2e8f0);
		background: var(--rf-color-surface-alt, #f8fafc);
	}

	.source-editor__close {
		background: transparent;
		border: none;
		font-size: 1.125rem;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		line-height: 1;
	}

	.source-editor__close:hover {
		color: var(--rf-color-text, #1e293b);
		background: var(--rf-color-border, #e2e8f0);
	}

	.source-editor__cm {
		min-height: 80px;
	}

	.source-editor__preview {
		padding: 0.75rem;
		max-height: 300px;
		overflow-y: auto;
		border-top: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.source-editor__error {
		margin: 0;
		color: var(--rf-color-danger-700, #b91c1c);
		font-size: 0.8125rem;
	}

	.source-editor__empty {
		margin: 0;
		color: var(--rf-color-text-muted, #94a3b8);
		font-size: 0.8125rem;
		font-style: italic;
	}
</style>
