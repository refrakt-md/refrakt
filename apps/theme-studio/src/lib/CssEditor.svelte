<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorState } from '@codemirror/state';
	import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
	import { basicSetup } from 'codemirror';
	import { css } from '@codemirror/lang-css';
	import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
	import { tags } from '@lezer/highlight';

	interface Props {
		value: string;
		onchange: (css: string) => void;
		placeholder?: string;
	}

	let { value, onchange, placeholder = '' }: Props = $props();

	let container: HTMLElement;
	let editorView: EditorView;

	const darkTheme = EditorView.theme(
		{
			'&': {
				backgroundColor: '#1e1e2e',
				color: '#cdd6f4',
				fontSize: '12px',
				height: '100%',
			},
			'.cm-scroller': {
				overflow: 'auto',
				fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
				lineHeight: '1.6',
			},
			'.cm-content': {
				padding: '12px 0',
				caretColor: '#cdd6f4',
			},
			'.cm-gutters': {
				backgroundColor: '#181825',
				color: '#585b70',
				border: 'none',
			},
			'.cm-activeLineGutter': {
				backgroundColor: '#1e1e2e',
				color: '#a6adc8',
			},
			'.cm-activeLine': {
				backgroundColor: 'rgba(205, 214, 244, 0.05)',
			},
			'.cm-cursor': {
				borderLeftColor: '#cdd6f4',
			},
			'&.cm-focused .cm-selectionBackground, ::selection': {
				backgroundColor: 'rgba(137, 180, 250, 0.2)',
			},
			'.cm-selectionBackground': {
				backgroundColor: 'rgba(137, 180, 250, 0.2)',
			},
			'.cm-placeholder': {
				color: '#585b70',
			},
			'&.cm-focused': {
				outline: 'none',
			},
		},
		{ dark: true },
	);

	const highlightTheme = HighlightStyle.define([
		{ tag: tags.keyword, color: '#cba6f7' },
		{ tag: tags.propertyName, color: '#89b4fa' },
		{ tag: tags.string, color: '#a6e3a1' },
		{ tag: tags.number, color: '#fab387' },
		{ tag: tags.unit, color: '#fab387' },
		{ tag: tags.comment, color: '#585b70' },
		{ tag: tags.className, color: '#f38ba8' },
		{ tag: tags.tagName, color: '#89dceb' },
		{ tag: tags.punctuation, color: '#6c7086' },
		{ tag: tags.variableName, color: '#f5c2e7' },
		{ tag: tags.color, color: '#f9e2af' },
	]);

	onMount(() => {
		const state = EditorState.create({
			doc: value,
			extensions: [
				basicSetup,
				css(),
				darkTheme,
				syntaxHighlighting(highlightTheme),
				...(placeholder ? [cmPlaceholder(placeholder)] : []),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onchange(update.state.doc.toString());
					}
				}),
			],
		});

		editorView = new EditorView({ state, parent: container });
	});

	// Sync external value changes (AI generation, undo/redo, rune switch) into editor
	$effect(() => {
		const current = value;
		if (!editorView) return;

		const editorContent = editorView.state.doc.toString();
		if (current !== editorContent) {
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: current,
				},
			});
		}
	});

	onDestroy(() => {
		editorView?.destroy();
	});
</script>

<div class="css-editor" bind:this={container}></div>

<style>
	.css-editor {
		height: 100%;
		min-height: 200px;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid #e5e5e5;
	}
	.css-editor:focus-within {
		border-color: #0ea5e9;
	}
</style>
