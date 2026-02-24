<script lang="ts">
	import { EditorState } from '@codemirror/state';
	import {
		EditorView,
		keymap,
		lineNumbers,
		highlightActiveLineGutter,
		highlightActiveLine,
	} from '@codemirror/view';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
	import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
	import { tags } from '@lezer/highlight';
	import { untrack } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';

	let container: HTMLElement;
	let editorView: EditorView;

	const lightTheme = EditorView.theme(
		{
			'&': {
				backgroundColor: '#ffffff',
				color: '#1a1a2e',
				fontSize: '13px',
				height: '100%',
			},
			'.cm-scroller': {
				overflow: 'auto',
				fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
				lineHeight: '1.6',
			},
			'.cm-content': {
				padding: '1rem 0',
				caretColor: '#1e293b',
			},
			'.cm-gutters': {
				backgroundColor: '#f8fafc',
				color: '#94a3b8',
				border: 'none',
				paddingRight: '0.5rem',
			},
			'.cm-activeLineGutter': {
				backgroundColor: '#e2e8f0',
				color: '#64748b',
			},
			'.cm-activeLine': {
				backgroundColor: 'rgba(0, 0, 0, 0.03)',
			},
			'.cm-cursor': {
				borderLeftColor: '#1e293b',
			},
			'&.cm-focused .cm-selectionBackground, ::selection': {
				backgroundColor: 'rgba(14, 165, 233, 0.2)',
			},
			'.cm-selectionBackground': {
				backgroundColor: 'rgba(14, 165, 233, 0.12)',
			},
			'&.cm-focused': {
				outline: 'none',
			},
		},
		{ dark: false },
	);

	const highlightTheme = HighlightStyle.define([
		{ tag: tags.heading1, color: '#0369a1', fontWeight: 'bold', fontSize: '1.4em' },
		{ tag: tags.heading2, color: '#0369a1', fontWeight: 'bold', fontSize: '1.2em' },
		{ tag: tags.heading3, color: '#0369a1', fontWeight: 'bold', fontSize: '1.1em' },
		{ tag: tags.heading, color: '#0369a1', fontWeight: 'bold' },
		{ tag: tags.emphasis, color: '#9333ea', fontStyle: 'italic' },
		{ tag: tags.strong, color: '#9333ea', fontWeight: 'bold' },
		{ tag: tags.link, color: '#0ea5e9', textDecoration: 'underline' },
		{ tag: tags.url, color: '#0ea5e9' },
		{ tag: tags.quote, color: '#64748b' },
		{ tag: tags.monospace, color: '#16a34a' },
		{ tag: tags.processingInstruction, color: '#d97706' },
		{ tag: tags.meta, color: '#94a3b8' },
		{ tag: tags.comment, color: '#94a3b8' },
		{ tag: tags.punctuation, color: '#94a3b8' },
	]);

	// Create CodeMirror when container is available, destroy on cleanup
	$effect(() => {
		if (!container) return;

		const state = EditorState.create({
			doc: untrack(() => editorState.bodyContent),
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				markdown(),
				lightTheme,
				syntaxHighlighting(highlightTheme),
				highlightSelectionMatches(),
				keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						editorState.updateBody(update.state.doc.toString());
					}
				}),
				EditorView.lineWrapping,
			],
		});

		editorView = new EditorView({ state, parent: container });

		return () => {
			editorView?.destroy();
		};
	});

	// Sync external value changes (file switch) into CodeMirror
	$effect(() => {
		const current = editorState.bodyContent;
		if (!editorView) return;

		const cmContent = editorView.state.doc.toString();
		if (current !== cmContent) {
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: current,
				},
			});
		}
	});
</script>

<div class="md-editor" bind:this={container} class:hidden={!editorState.currentPath}></div>
{#if !editorState.currentPath}
	<div class="md-editor__empty">
		<span class="md-editor__empty-text">Select a file to edit</span>
	</div>
{/if}

<style>
	.md-editor {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.md-editor.hidden {
		display: none;
	}

	.md-editor :global(.cm-editor) {
		height: 100%;
	}

	.md-editor__empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.md-editor__empty-text {
		color: #475569;
		font-size: 0.9rem;
	}
</style>
