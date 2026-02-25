<script lang="ts">
	import { EditorState, Compartment } from '@codemirror/state';
	import { EditorView, keymap } from '@codemirror/view';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import { syntaxHighlighting, LanguageDescription, defaultHighlightStyle } from '@codemirror/language';
	import { languages } from '@codemirror/language-data';
	import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
	import { autocompletion, startCompletion } from '@codemirror/autocomplete';
	import { untrack } from 'svelte';
	import type { RuneInfo } from '../api/client.js';
	import { highlightTheme } from '../editor/codemirror-theme.js';
	import { runeCompletionSource } from '../editor/rune-palette.js';
	import { attributeCompletionSource } from '../editor/attribute-completion.js';
	import { markdocHighlight } from '../editor/markdoc-highlight.js';

	interface Props {
		content: string;
		onchange: (content: string) => void;
		runes: () => RuneInfo[];
		language?: string;
	}

	let { content, onchange, runes, language }: Props = $props();

	let container: HTMLElement;
	let view = $state<EditorView | undefined>(undefined);

	const langCompartment = new Compartment();
	const markdocCompartment = new Compartment();
	const completionCompartment = new Compartment();

	const inlineTheme = EditorView.theme(
		{
			'&': {
				backgroundColor: '#ffffff',
				color: '#1a1a2e',
				fontSize: '13px',
				height: 'auto',
			},
			'.cm-scroller': {
				overflow: 'visible',
				fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
				lineHeight: '1.6',
			},
			'.cm-content': {
				padding: '0.75rem',
				caretColor: '#1e293b',
				minHeight: '3rem',
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
			'.cm-activeLine': {
				backgroundColor: 'transparent',
			},
			'.cm-tooltip.cm-tooltip-autocomplete': {
				border: '1px solid #e2e8f0',
				borderRadius: '6px',
				boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
				backgroundColor: '#ffffff',
				overflow: 'hidden',
			},
			'.cm-tooltip.cm-tooltip-autocomplete ul': {
				fontFamily: 'system-ui, -apple-system, sans-serif',
				fontSize: '12px',
				maxHeight: '280px',
			},
			'.cm-tooltip.cm-tooltip-autocomplete ul li': {
				padding: '4px 8px',
				borderBottom: '1px solid #f1f5f9',
			},
			'.cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
				backgroundColor: '#f0f9ff',
				color: '#0369a1',
			},
			'.cm-tooltip.cm-completionInfo': {
				border: '1px solid #e2e8f0',
				borderRadius: '6px',
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
				backgroundColor: '#ffffff',
				padding: '6px 10px',
				fontFamily: 'system-ui, -apple-system, sans-serif',
				fontSize: '12px',
				color: '#475569',
				maxWidth: '300px',
			},
			'.cm-completionDetail': {
				color: '#94a3b8',
				fontStyle: 'normal',
				marginLeft: '0.5em',
			},
			'.cm-markdoc-tag': {
				backgroundColor: 'rgba(217, 119, 6, 0.06)',
				borderRadius: '2px',
			},
			'.cm-markdoc-bracket': {
				color: '#94a3b8',
			},
			'.cm-markdoc-name': {
				color: '#d97706',
				fontWeight: '600',
			},
		},
		{ dark: false },
	);

	// Create the CodeMirror instance (once, when container is available)
	$effect(() => {
		if (!container) return;

		const codeMode = !!(untrack(() => language)?.trim());

		const state = EditorState.create({
			doc: untrack(() => content),
			extensions: [
				langCompartment.of(markdown()),
				markdocCompartment.of(codeMode ? [] : markdocHighlight()),
				completionCompartment.of(codeMode ? [] : autocompletion({
					override: [
						runeCompletionSource(runes),
						attributeCompletionSource(runes),
					],
					icons: false,
				})),
				history(),
				inlineTheme,
				syntaxHighlighting(highlightTheme),
				syntaxHighlighting(defaultHighlightStyle),
				highlightSelectionMatches(),
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					...searchKeymap,
					{ key: 'Mod-/', run: (v) => { startCompletion(v); return true; } },
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onchange(update.state.doc.toString());
					}
				}),
				EditorView.lineWrapping,
			],
		});

		const editor = new EditorView({ state, parent: container });
		view = editor;

		return () => {
			view = undefined;
			editor.destroy();
		};
	});

	// Load and apply the correct language when `language` prop or `view` changes
	$effect(() => {
		const editor = view;
		if (!editor) return;

		const lang = language?.trim();
		if (!lang) {
			// No language — use markdown with markdoc extras
			editor.dispatch({
				effects: [
					langCompartment.reconfigure(markdown()),
					markdocCompartment.reconfigure(markdocHighlight()),
					completionCompartment.reconfigure(autocompletion({
						override: [
							runeCompletionSource(runes),
							attributeCompletionSource(runes),
						],
						icons: false,
					})),
				],
			});
			return;
		}

		// Code mode — disable markdoc/rune extras
		editor.dispatch({
			effects: [
				markdocCompartment.reconfigure([]),
				completionCompartment.reconfigure([]),
			],
		});

		// Find and load the language
		const desc = LanguageDescription.matchLanguageName(languages, lang, true);
		if (desc) {
			desc.load().then((langSupport) => {
				// Guard: only apply if this editor is still the current one
				if (view === editor) {
					editor.dispatch({
						effects: langCompartment.reconfigure(langSupport),
					});
				}
			});
		}
	});

	// Sync external content changes into the CodeMirror instance
	$effect(() => {
		const current = content;
		const editor = view;
		if (!editor) return;

		const cmContent = editor.state.doc.toString();
		if (current !== cmContent) {
			editor.dispatch({
				changes: { from: 0, to: editor.state.doc.length, insert: current },
			});
		}
	});
</script>

<div class="inline-editor" bind:this={container}></div>

<style>
	.inline-editor :global(.cm-editor) {
		height: auto;
	}

	.inline-editor :global(.cm-scroller) {
		overflow: visible;
	}
</style>
