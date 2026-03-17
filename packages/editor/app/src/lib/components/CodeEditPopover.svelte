<script lang="ts">
	import { onMount } from 'svelte';

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
	let textareaEl: HTMLTextAreaElement;
	let left = $state(0);
	let top = $state(0);
	let showAbove = $state(true);

	let editCode = $state(code);
	let editLanguage = $state(language);

	const languages = $derived(
		LANGUAGES.includes(editLanguage) || !editLanguage ? LANGUAGES : [editLanguage, ...LANGUAGES]
	);

	onMount(() => {
		const popoverRect = popoverEl.getBoundingClientRect();
		const popoverWidth = popoverRect.width;
		const popoverHeight = popoverRect.height;
		const gap = 8;

		// Horizontal: center on anchor
		let x = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
		if (x < gap) x = gap;
		if (x + popoverWidth > window.innerWidth - gap) x = window.innerWidth - popoverWidth - gap;
		left = x;

		// Vertical: above anchor if room, else below
		const aboveY = anchorRect.top - popoverHeight - gap;
		if (aboveY >= gap) {
			top = aboveY;
			showAbove = true;
		} else {
			top = anchorRect.bottom + gap;
			showAbove = false;
		}

		textareaEl?.focus();
		textareaEl?.select();

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

	function applyAndClose() {
		if (editCode !== code) {
			onchange(editCode);
		}
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		// Cmd/Ctrl+Enter to apply (Enter inserts newlines in textarea)
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			applyAndClose();
		}
	}

	function handleLanguageChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		editLanguage = select.value;
		onlanguagechange(editLanguage);
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
			{#each languages as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
	</div>

	<textarea
		class="code-edit-popover__textarea"
		bind:value={editCode}
		bind:this={textareaEl}
		onkeydown={handleKeydown}
		rows={Math.max(2, editCode.split('\n').length)}
		spellcheck="false"
	></textarea>

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

	/* ── Textarea ────────────────────────────────────────── */

	.code-edit-popover__textarea {
		width: 100%;
		min-height: 3rem;
		max-height: 12rem;
		padding: var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		font-family: var(--ed-font-mono, 'SF Mono', 'Fira Code', monospace);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-1, #f8fafc);
		outline: none;
		line-height: 1.5;
		resize: vertical;
		tab-size: 2;
		box-sizing: border-box;
	}

	.code-edit-popover__textarea:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
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
