<script lang="ts">
	import { onMount } from 'svelte';
	import { parseInlineMarkdown, serializeInlineHtml, normalizeEditableDom } from '../editor/inline-markdown.js';

	interface Props {
		anchorRect: DOMRect;
		dataName: string;
		inlineSource: string;
		onchange: (newInlineSource: string) => void;
		onclose: () => void;
	}

	let { anchorRect, dataName, inlineSource, onchange, onclose }: Props = $props();

	let popoverEl: HTMLDivElement;
	let editableEl: HTMLDivElement;
	let left = $state(0);
	let top = $state(0);
	let showAbove = $state(true);

	// Link editing state
	let linkEdit: {
		anchorEl: HTMLAnchorElement;
		href: string;
		text: string;
		rect: DOMRect;
	} | null = $state(null);
	let linkHrefInput: HTMLInputElement | undefined = $state();

	let debounceTimer: ReturnType<typeof setTimeout>;

	onMount(() => {
		// Set initial content from markdown source
		editableEl.innerHTML = parseInlineMarkdown(inlineSource);

		// Position centered above the anchor by default
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

		// Focus and place cursor at end
		editableEl.focus();
		const sel = window.getSelection();
		if (sel && editableEl.childNodes.length > 0) {
			const range = document.createRange();
			range.selectNodeContents(editableEl);
			range.collapse(false);
			sel.removeAllRanges();
			sel.addRange(range);
		}

		// Close handlers
		function handleClickOutside(e: MouseEvent) {
			if (popoverEl && !popoverEl.contains(e.target as Node)) {
				onclose();
			}
		}

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				if (linkEdit) {
					linkEdit = null;
				} else {
					onclose();
				}
			}
		}

		requestAnimationFrame(() => {
			document.addEventListener('mousedown', handleClickOutside);
		});
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
			clearTimeout(debounceTimer);
		};
	});

	function handleInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			normalizeEditableDom(editableEl);
			const md = serializeInlineHtml(editableEl);
			onchange(md);
		}, 100);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Block Enter to prevent block-level elements
		if (e.key === 'Enter') {
			e.preventDefault();
			return;
		}

		const mod = e.metaKey || e.ctrlKey;
		if (!mod) return;

		if (e.key === 'b') {
			e.preventDefault();
			toggleFormat('bold');
		} else if (e.key === 'i') {
			e.preventDefault();
			toggleFormat('italic');
		} else if (e.key === 'k') {
			e.preventDefault();
			openLinkEditor();
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text);
	}

	function handleEditableClick(e: MouseEvent) {
		// Check if an <a> was clicked
		const target = e.target as HTMLElement;
		const anchor = target.closest('a') as HTMLAnchorElement | null;
		if (anchor && editableEl.contains(anchor)) {
			e.preventDefault();
			openLinkEditorForAnchor(anchor);
		}
	}

	// ── Formatting ──────────────────────────────────────────────

	function toggleFormat(format: 'bold' | 'italic' | 'code') {
		editableEl.focus();
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		if (format === 'code') {
			const range = sel.getRangeAt(0);
			if (range.collapsed) return;

			// Check if selection is already inside a <code>
			const codeParent = findAncestor(range.commonAncestorContainer, 'CODE', editableEl);
			if (codeParent) {
				// Unwrap: replace <code> with its text content
				const text = document.createTextNode(codeParent.textContent ?? '');
				codeParent.replaceWith(text);
				// Re-select the text
				const newRange = document.createRange();
				newRange.selectNode(text);
				sel.removeAllRanges();
				sel.addRange(newRange);
			} else {
				const code = document.createElement('code');
				code.textContent = range.toString();
				range.deleteContents();
				range.insertNode(code);
				// Select the code element contents
				const newRange = document.createRange();
				newRange.selectNodeContents(code);
				sel.removeAllRanges();
				sel.addRange(newRange);
			}
		} else {
			// Bold and italic use execCommand for simplicity
			const command = format === 'bold' ? 'bold' : 'italic';
			document.execCommand(command, false);
		}

		normalizeEditableDom(editableEl);
		handleInput();
	}

	function openLinkEditor() {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		const range = sel.getRangeAt(0);

		// Check if cursor is inside an existing link
		const existingLink = findAncestor(range.commonAncestorContainer, 'A', editableEl) as HTMLAnchorElement | null;
		if (existingLink) {
			openLinkEditorForAnchor(existingLink);
			return;
		}

		// Create a new link from selection
		if (range.collapsed) return;

		const linkText = range.toString();
		const a = document.createElement('a');
		a.href = '';
		a.textContent = linkText;
		range.deleteContents();
		range.insertNode(a);

		openLinkEditorForAnchor(a);
	}

	function openLinkEditorForAnchor(anchor: HTMLAnchorElement) {
		linkEdit = {
			anchorEl: anchor,
			href: anchor.getAttribute('href') ?? '',
			text: anchor.textContent ?? '',
			rect: anchor.getBoundingClientRect(),
		};
		// Focus the URL input after render
		requestAnimationFrame(() => {
			linkHrefInput?.focus();
			linkHrefInput?.select();
		});
	}

	function applyLinkEdit() {
		if (!linkEdit) return;
		linkEdit.anchorEl.href = linkEdit.href;
		linkEdit.anchorEl.textContent = linkEdit.text;
		linkEdit = null;
		editableEl.focus();
		handleInput();
	}

	function removeLinkEdit() {
		if (!linkEdit) return;
		const text = document.createTextNode(linkEdit.anchorEl.textContent ?? '');
		linkEdit.anchorEl.replaceWith(text);
		linkEdit = null;
		editableEl.focus();
		handleInput();
	}

	function handleLinkKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			applyLinkEdit();
		}
	}

	// ── Toolbar state ───────────────────────────────────────────

	let isBold = $state(false);
	let isItalic = $state(false);
	let isCode = $state(false);

	function updateToolbarState() {
		isBold = document.queryCommandState('bold');
		isItalic = document.queryCommandState('italic');

		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			isCode = !!findAncestor(sel.getRangeAt(0).commonAncestorContainer, 'CODE', editableEl);
		} else {
			isCode = false;
		}
	}

	// ── Helpers ─────────────────────────────────────────────────

	function findAncestor(node: globalThis.Node, tagName: string, boundary: HTMLElement): HTMLElement | null {
		let current: globalThis.Node | null = node;
		while (current && current !== boundary) {
			if (current.nodeType === globalThis.Node.ELEMENT_NODE && (current as HTMLElement).tagName === tagName) {
				return current as HTMLElement;
			}
			current = current.parentNode;
		}
		return null;
	}
</script>

<div
	class="inline-edit-popover"
	class:above={showAbove}
	class:below={!showAbove}
	bind:this={popoverEl}
	style="left: {left}px; top: {top}px"
>
	<!-- Titlebar -->
	<div class="inline-edit-popover__header">
		<span class="inline-edit-popover__label">{dataName}</span>
		<button class="inline-edit-popover__close" onclick={onclose} aria-label="Close">&times;</button>
	</div>

	<!-- Toolbar -->
	<div class="inline-edit-popover__toolbar">
		<button
			class="inline-edit-popover__tool-btn"
			class:active={isBold}
			onclick={() => toggleFormat('bold')}
			title="Bold (Ctrl+B)"
		><strong>B</strong></button>
		<button
			class="inline-edit-popover__tool-btn"
			class:active={isItalic}
			onclick={() => toggleFormat('italic')}
			title="Italic (Ctrl+I)"
		><em>I</em></button>
		<button
			class="inline-edit-popover__tool-btn inline-edit-popover__tool-btn--code"
			class:active={isCode}
			onclick={() => toggleFormat('code')}
			title="Inline code"
		>&lt;/&gt;</button>
		<button
			class="inline-edit-popover__tool-btn"
			onclick={openLinkEditor}
			title="Link (Ctrl+K)"
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M6.5 9.5a3 3 0 0 0 4.2.3l2-2a3 3 0 0 0-4.2-4.3l-1.1 1.1" />
				<path d="M9.5 6.5a3 3 0 0 0-4.2-.3l-2 2a3 3 0 0 0 4.2 4.3l1.1-1.1" />
			</svg>
		</button>
	</div>

	<!-- Editable content area -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="inline-edit-popover__editable"
		contenteditable="true"
		bind:this={editableEl}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onkeyup={updateToolbarState}
		onmouseup={updateToolbarState}
		onpaste={handlePaste}
		onclick={handleEditableClick}
	></div>

	<!-- Link editor sub-popover -->
	{#if linkEdit}
		<div class="inline-edit-popover__link-editor">
			<div class="inline-edit-popover__link-row">
				<label class="inline-edit-popover__link-label">Text</label>
				<input
					class="inline-edit-popover__link-input"
					type="text"
					bind:value={linkEdit.text}
					onkeydown={handleLinkKeydown}
				/>
			</div>
			<div class="inline-edit-popover__link-row">
				<label class="inline-edit-popover__link-label">URL</label>
				<input
					class="inline-edit-popover__link-input"
					type="text"
					bind:value={linkEdit.href}
					bind:this={linkHrefInput}
					onkeydown={handleLinkKeydown}
					placeholder="https://..."
				/>
			</div>
			<div class="inline-edit-popover__link-actions">
				<button class="inline-edit-popover__link-btn inline-edit-popover__link-btn--apply" onclick={applyLinkEdit}>Apply</button>
				<button class="inline-edit-popover__link-btn inline-edit-popover__link-btn--remove" onclick={removeLinkEdit}>Remove link</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.inline-edit-popover {
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
		min-width: 280px;
		max-width: 520px;
		animation: inline-edit-enter 120ms ease-out;
	}

	.inline-edit-popover.above {
		transform-origin: bottom center;
	}

	.inline-edit-popover.below {
		transform-origin: top center;
	}

	@keyframes inline-edit-enter {
		from { opacity: 0; transform: scale(0.97) translateY(4px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ── Header ──────────────────────────────────────────── */

	.inline-edit-popover__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--ed-space-1, 0.25rem);
	}

	.inline-edit-popover__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.inline-edit-popover__close {
		background: none;
		border: none;
		font-size: 18px;
		line-height: 1;
		color: var(--ed-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 4px;
	}

	.inline-edit-popover__close:hover {
		color: var(--ed-text-primary, #1a1a2e);
	}

	/* ── Toolbar ──────────────────────────────────────────── */

	.inline-edit-popover__toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 0 var(--ed-space-1, 0.25rem);
	}

	.inline-edit-popover__tool-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		border-radius: var(--ed-radius-sm, 4px);
		background: transparent;
		color: var(--ed-text-tertiary, #a0aec0);
		cursor: pointer;
		font-size: 13px;
		font-family: inherit;
		transition: background 100ms, color 100ms;
	}

	.inline-edit-popover__tool-btn:hover {
		background: var(--ed-surface-2, #f1f5f9);
		color: var(--ed-text-secondary, #475569);
	}

	.inline-edit-popover__tool-btn.active {
		background: var(--ed-accent-muted, rgba(59, 130, 246, 0.1));
		color: var(--ed-accent, #3b82f6);
	}

	.inline-edit-popover__tool-btn--code {
		font-size: 10px;
		font-family: monospace;
		letter-spacing: -0.5px;
	}

	/* ── Editable area ────────────────────────────────────── */

	.inline-edit-popover__editable {
		min-height: 1.6em;
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-0, #fff);
		outline: none;
		font-family: inherit;
		line-height: 1.6;
		white-space: nowrap;
		overflow-x: auto;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.inline-edit-popover__editable:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	/* Inline formatting styles within the editable area */
	.inline-edit-popover__editable :global(a) {
		color: var(--ed-accent, #3b82f6);
		text-decoration: underline;
		text-decoration-style: dashed;
		text-underline-offset: 2px;
		cursor: pointer;
	}

	.inline-edit-popover__editable :global(a:hover) {
		text-decoration-style: solid;
	}

	.inline-edit-popover__editable :global(code) {
		background: var(--ed-surface-2, #f1f5f9);
		border-radius: 3px;
		padding: 0.1em 0.3em;
		font-family: monospace;
		font-size: 0.9em;
	}

	.inline-edit-popover__editable :global(strong) {
		font-weight: 700;
	}

	.inline-edit-popover__editable :global(em) {
		font-style: italic;
	}

	/* ── Link editor ──────────────────────────────────────── */

	.inline-edit-popover__link-editor {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-1, 0.25rem);
		padding: var(--ed-space-2, 0.5rem);
		border-top: 1px solid var(--ed-border-default, #e2e8f0);
		margin-top: var(--ed-space-1, 0.25rem);
	}

	.inline-edit-popover__link-row {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2, 0.5rem);
	}

	.inline-edit-popover__link-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		width: 32px;
		flex-shrink: 0;
	}

	.inline-edit-popover__link-input {
		flex: 1;
		min-width: 0;
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-0, #fff);
		outline: none;
		font-family: inherit;
		line-height: 1.4;
	}

	.inline-edit-popover__link-input:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	.inline-edit-popover__link-actions {
		display: flex;
		gap: var(--ed-space-2, 0.5rem);
		margin-top: var(--ed-space-1, 0.25rem);
	}

	.inline-edit-popover__link-btn {
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

	.inline-edit-popover__link-btn:hover:not(.inline-edit-popover__link-btn--apply):not(:disabled) {
		border-color: var(--ed-text-primary);
		color: var(--ed-text-primary);
	}

	.inline-edit-popover__link-btn--apply {
		background: var(--ed-text-primary);
		color: #ffffff;
		border-color: var(--ed-text-primary);
	}

	.inline-edit-popover__link-btn--apply:hover:not(:disabled) {
		background: var(--ed-text-secondary);
		border-color: var(--ed-text-secondary);
	}
</style>
