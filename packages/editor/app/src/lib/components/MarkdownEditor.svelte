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

	const darkTheme = EditorView.theme(
		{
			'&': {
				backgroundColor: '#12141c',
				color: '#cdd6f4',
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
				caretColor: '#cdd6f4',
			},
			'.cm-gutters': {
				backgroundColor: '#0f1117',
				color: '#3a3d4a',
				border: 'none',
				paddingRight: '0.5rem',
			},
			'.cm-activeLineGutter': {
				backgroundColor: '#161822',
				color: '#64748b',
			},
			'.cm-activeLine': {
				backgroundColor: 'rgba(205, 214, 244, 0.04)',
			},
			'.cm-cursor': {
				borderLeftColor: '#818cf8',
			},
			'&.cm-focused .cm-selectionBackground, ::selection': {
				backgroundColor: 'rgba(129, 140, 248, 0.2)',
			},
			'.cm-selectionBackground': {
				backgroundColor: 'rgba(129, 140, 248, 0.15)',
			},
			'&.cm-focused': {
				outline: 'none',
			},
		},
		{ dark: true },
	);

	const highlightTheme = HighlightStyle.define([
		{ tag: tags.heading1, color: '#818cf8', fontWeight: 'bold', fontSize: '1.4em' },
		{ tag: tags.heading2, color: '#818cf8', fontWeight: 'bold', fontSize: '1.2em' },
		{ tag: tags.heading3, color: '#818cf8', fontWeight: 'bold', fontSize: '1.1em' },
		{ tag: tags.heading, color: '#818cf8', fontWeight: 'bold' },
		{ tag: tags.emphasis, color: '#f5c2e7', fontStyle: 'italic' },
		{ tag: tags.strong, color: '#f5c2e7', fontWeight: 'bold' },
		{ tag: tags.link, color: '#89b4fa', textDecoration: 'underline' },
		{ tag: tags.url, color: '#89b4fa' },
		{ tag: tags.quote, color: '#a6adc8' },
		{ tag: tags.monospace, color: '#a6e3a1' },
		{ tag: tags.processingInstruction, color: '#f9e2af' },
		{ tag: tags.meta, color: '#6c7086' },
		{ tag: tags.comment, color: '#585b70' },
		{ tag: tags.punctuation, color: '#6c7086' },
	]);

	// Create CodeMirror when container is available, destroy on cleanup
	$effect(() => {
		if (!container) return;

		const state = EditorState.create({
			doc: untrack(() => editorState.editorContent),
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				markdown(),
				darkTheme,
				syntaxHighlighting(highlightTheme),
				highlightSelectionMatches(),
				keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						editorState.editorContent = update.state.doc.toString();
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
		const current = editorState.editorContent;
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
		height: 100%;
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
