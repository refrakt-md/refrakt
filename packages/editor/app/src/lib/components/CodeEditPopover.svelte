<script lang="ts">
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import { EditorState, Compartment } from '@codemirror/state';
	import { EditorView, keymap } from '@codemirror/view';
	import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
	import { HighlightStyle, syntaxHighlighting, LanguageDescription, defaultHighlightStyle } from '@codemirror/language';
	import { languages as languageData } from '@codemirror/language-data';
	import { markdown } from '@codemirror/lang-markdown';
	import { tags } from '@lezer/highlight';
	import { markdocHighlight } from '../editor/markdoc-highlight.js';

	const LANGUAGES = [
		'bash', 'sh', 'shell', 'javascript', 'typescript',
		'python', 'html', 'css', 'json', 'yaml', 'markdown', 'markdoc',
		'go', 'rust', 'java', 'c', 'cpp', 'ruby', 'php', 'sql', 'swift',
		'kotlin', 'dart', 'lua', 'r', 'perl', 'scala', 'haskell', 'elixir',
		'toml', 'xml', 'graphql', 'dockerfile', 'diff', 'plaintext',
	];

	interface Props {
		anchorRect: DOMRect;
		code: string;
		language: string;
		onchange: (newCode: string) => void;
		onlanguagechange: (newLanguage: string) => void;
		onremove: () => void;
		onclose: () => void;
	}

	let { anchorRect, code, language, onchange, onlanguagechange, onremove, onclose }: Props = $props();

	let popoverEl: HTMLDivElement;
	let editorContainer: HTMLDivElement;
	let view = $state<EditorView | undefined>(undefined);
	let left = $state(0);
	let top = $state(0);
	let showAbove = $state(true);

	let editCode = $state(code);
	let editLanguage = $state(language);

	const langCompartment = new Compartment();
	const markdocCompartment = new Compartment();

	const codeHighlightStyle = HighlightStyle.define([
		{ tag: tags.keyword, color: '#8839ef' },
		{ tag: [tags.atom, tags.bool], color: '#fe640b' },
		{ tag: tags.number, color: '#fe640b' },
		{ tag: [tags.string, tags.special(tags.string)], color: '#40a02b' },
		{ tag: [tags.regexp, tags.escape], color: '#ea76cb' },
		{ tag: tags.definition(tags.variableName), color: '#1e66f5' },
		{ tag: tags.local(tags.variableName), color: '#1e66f5' },
		{ tag: tags.variableName, color: '#4c4f69' },
		{ tag: tags.definition(tags.propertyName), color: '#1e66f5' },
		{ tag: tags.propertyName, color: '#1e66f5' },
		{ tag: [tags.typeName, tags.className, tags.namespace], color: '#df8e1d' },
		{ tag: [tags.macroName, tags.labelName], color: '#d20f39' },
		{ tag: tags.function(tags.variableName), color: '#1e66f5' },
		{ tag: tags.operator, color: '#04a5e5' },
		{ tag: tags.punctuation, color: '#7c7f93' },
		{ tag: tags.comment, color: '#9ca0b0', fontStyle: 'italic' },
		{ tag: tags.lineComment, color: '#9ca0b0', fontStyle: 'italic' },
		{ tag: tags.blockComment, color: '#9ca0b0', fontStyle: 'italic' },
		{ tag: tags.meta, color: '#7c7f93' },
		{ tag: tags.link, color: '#1e66f5', textDecoration: 'underline' },
		{ tag: tags.url, color: '#1e66f5' },
		{ tag: tags.invalid, color: '#d20f39' },
	]);

	const popoverEditorTheme = EditorView.theme(
		{
			'&': {
				fontSize: '13px',
				height: 'auto',
				backgroundColor: 'var(--ed-surface-1, #f8fafc)',
				border: '1px solid var(--ed-border-default, #e2e8f0)',
				borderRadius: 'var(--ed-radius-sm, 4px)',
			},
			'&.cm-focused': {
				outline: 'none',
				borderColor: 'var(--ed-accent, #3b82f6)',
				boxShadow: '0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2))',
			},
			'.cm-scroller': {
				overflow: 'auto',
				maxHeight: '12rem',
				fontFamily: "var(--ed-font-mono, 'SF Mono', 'Fira Code', monospace)",
				lineHeight: '1.5',
			},
			'.cm-content': {
				padding: 'var(--ed-space-2, 0.5rem)',
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
			'.cm-activeLine': {
				backgroundColor: 'transparent',
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

	const languageOptions = $derived(
		LANGUAGES.includes(editLanguage) || !editLanguage ? LANGUAGES : [editLanguage, ...LANGUAGES]
	);

	function recalculatePosition() {
		if (!popoverEl) return;
		const popoverRect = popoverEl.getBoundingClientRect();
		const popoverWidth = popoverRect.width;
		const popoverHeight = popoverRect.height;
		const gap = 8;

		let x = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
		if (x < gap) x = gap;
		if (x + popoverWidth > window.innerWidth - gap) x = window.innerWidth - popoverWidth - gap;
		left = x;

		const aboveY = anchorRect.top - popoverHeight - gap;
		if (aboveY >= gap) {
			top = aboveY;
			showAbove = true;
		} else {
			top = anchorRect.bottom + gap;
			showAbove = false;
		}
	}

	onMount(() => {
		recalculatePosition();

		function handleClickOutside(e: MouseEvent) {
			if (popoverEl && !popoverEl.contains(e.target as Node)) {
				applyAndClose();
			}
		}

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onclose();
			}
		}

		requestAnimationFrame(() => {
			document.addEventListener('mousedown', handleClickOutside);
		});
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// Create CodeMirror instance
	$effect(() => {
		if (!editorContainer) return;

		const state = EditorState.create({
			doc: untrack(() => editCode),
			extensions: [
				langCompartment.of(markdown()),
				markdocCompartment.of(untrack(() => editLanguage) === 'markdoc' ? markdocHighlight() : []),
				history(),
				popoverEditorTheme,
				syntaxHighlighting(codeHighlightStyle),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					indentWithTab,
					{
						key: 'Mod-Enter',
						run: () => {
							applyAndClose();
							return true;
						},
					},
					{
						key: 'Escape',
						run: () => {
							onclose();
							return true;
						},
					},
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						editCode = update.state.doc.toString();
					}
				}),
				EditorView.lineWrapping,
			],
		});

		const editor = new EditorView({ state, parent: editorContainer });
		view = editor;

		editor.focus();
		loadLanguage(editor, untrack(() => editLanguage));

		// Recalculate position after CodeMirror renders
		requestAnimationFrame(() => recalculatePosition());

		return () => {
			view = undefined;
			editor.destroy();
		};
	});

	function loadLanguage(editor: EditorView, lang: string | undefined) {
		const name = lang?.trim();
		if (!name) return;

		if (name === 'markdoc') {
			// Markdoc = markdown parser + markdoc tag decorations
			editor.dispatch({
				effects: [
					langCompartment.reconfigure(markdown()),
					markdocCompartment.reconfigure(markdocHighlight()),
				],
			});
			return;
		}

		// Disable markdoc decorations for other languages
		editor.dispatch({
			effects: markdocCompartment.reconfigure([]),
		});

		const desc = LanguageDescription.matchLanguageName(languageData, name, true);
		if (desc) {
			desc.load().then((langSupport) => {
				editor.dispatch({ effects: langCompartment.reconfigure(langSupport) });
			}).catch(console.error);
		}
	}

	function applyAndClose() {
		if (editCode !== code) {
			onchange(editCode);
		}
		onclose();
	}

	function handleLanguageChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		editLanguage = select.value;
		onlanguagechange(editLanguage);
		if (view) loadLanguage(view, editLanguage);
	}
</script>

<div
	class="code-edit-popover"
	class:above={showAbove}
	class:below={!showAbove}
	bind:this={popoverEl}
	style="left: {left}px; top: {top}px"
>
	<!-- Titlebar -->
	<div class="code-edit-popover__header">
		<span class="code-edit-popover__label">code</span>
		<button class="code-edit-popover__close" onclick={onclose} aria-label="Close">&times;</button>
	</div>

	<!-- Toolbar -->
	<div class="code-edit-popover__toolbar">
		<select
			class="code-edit-popover__lang-select"
			value={editLanguage}
			onchange={handleLanguageChange}
		>
			<option value="">No language</option>
			{#each languageOptions as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
	</div>

	<div class="code-edit-popover__editor" bind:this={editorContainer}></div>

	<div class="code-edit-popover__actions">
		<button class="code-edit-popover__btn code-edit-popover__btn--apply" onclick={applyAndClose}>Apply</button>
		<button class="code-edit-popover__btn code-edit-popover__btn--remove" onclick={onremove}>Remove</button>
	</div>
</div>

<style>
	.code-edit-popover {
		position: fixed;
		z-index: 1100;
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-1, 0.25rem);
		background: var(--ed-surface-0, #fff);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-lg, 8px);
		box-shadow: var(--ed-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1));
		padding: var(--ed-space-2, 0.5rem);
		min-width: 320px;
		max-width: 480px;
		animation: code-edit-enter 120ms ease-out;
	}

	.code-edit-popover.above {
		transform-origin: bottom center;
	}

	.code-edit-popover.below {
		transform-origin: top center;
	}

	@keyframes code-edit-enter {
		from { opacity: 0; transform: scale(0.97) translateY(4px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ── Header ──────────────────────────────────────────── */

	.code-edit-popover__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--ed-space-1, 0.25rem);
	}

	.code-edit-popover__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.code-edit-popover__close {
		background: none;
		border: none;
		font-size: 18px;
		line-height: 1;
		color: var(--ed-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 4px;
	}

	.code-edit-popover__close:hover {
		color: var(--ed-text-primary, #1a1a2e);
	}

	/* ── Toolbar ─────────────────────────────────────────── */

	.code-edit-popover__toolbar {
		padding: 0 var(--ed-space-1, 0.25rem);
	}

	.code-edit-popover__lang-select {
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		font-family: var(--ed-font-mono, 'SF Mono', 'Fira Code', monospace);
		color: var(--ed-text-secondary, #475569);
		background: var(--ed-surface-0, #fff);
		outline: none;
		cursor: pointer;
	}

	.code-edit-popover__lang-select:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	/* ── Editor ──────────────────────────────────────────── */

	.code-edit-popover__editor {
		min-height: 3rem;
	}

	.code-edit-popover__editor :global(.cm-gutters) {
		display: none;
	}

	/* ── Actions ─────────────────────────────────────────── */

	.code-edit-popover__actions {
		display: flex;
		gap: var(--ed-space-2, 0.5rem);
		margin-top: var(--ed-space-1, 0.25rem);
	}

	.code-edit-popover__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--ed-space-2);
		height: 28px;
		padding: 0 var(--ed-space-3);
		border: 1px solid var(--ed-text-secondary);
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), border-color var(--ed-transition-fast);
		white-space: nowrap;
	}

	.code-edit-popover__btn:hover:not(.code-edit-popover__btn--apply):not(:disabled) {
		border-color: var(--ed-text-primary);
		color: var(--ed-text-primary);
	}

	.code-edit-popover__btn--apply {
		background: var(--ed-text-primary);
		color: #ffffff;
		border-color: var(--ed-text-primary);
	}

	.code-edit-popover__btn--apply:hover:not(:disabled) {
		background: var(--ed-text-secondary);
		border-color: var(--ed-text-secondary);
	}
</style>
