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
	import { syntaxHighlighting } from '@codemirror/language';
	import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
	import { autocompletion, startCompletion } from '@codemirror/autocomplete';
	import { untrack } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';
	import { runeCompletionSource } from '../editor/rune-palette.js';
	import { attributeCompletionSource } from '../editor/attribute-completion.js';
	import { markdocHighlight } from '../editor/markdoc-highlight.js';
	import { lightTheme, highlightTheme } from '../editor/codemirror-theme.js';

	let container: HTMLElement;
	let editorView: EditorView;

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
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					...searchKeymap,
					{ key: 'Mod-/', run: (view) => { startCompletion(view); return true; } },
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						editorState.updateBody(update.state.doc.toString());
					}
				}),
				EditorView.lineWrapping,
				// Markdoc extensions
				markdocHighlight(),
				autocompletion({
					override: [
						runeCompletionSource(() => editorState.runes),
						attributeCompletionSource(() => editorState.runes),
					],
					icons: false,
				}),
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
