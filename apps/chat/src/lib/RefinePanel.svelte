<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RendererNode } from '@refrakt-md/types';
	import type { InProgressBlock } from './block-scanner.js';
	import { streamChat } from './stream.js';
	import { renderMarkdocSafe } from './pipeline.js';
	import SafeRenderer from './SafeRenderer.svelte';

	interface Props {
		pinId: string;
		currentSource: string;
		mode: string;
		model?: string;
		onaccept: (newSource: string) => void;
		onkeepboth: (newSource: string) => void;
		ondiscard: () => void;
	}

	let { pinId, currentSource, mode, model, onaccept, onkeepboth, ondiscard }: Props = $props();

	let instruction = $state('');
	let isStreaming = $state(false);
	let isThinking = $state(false);
	let accumulated = $state('');
	let previewNode = $state<RendererNode | null>(null);
	let inProgressBlocks = $state<InProgressBlock[]>([]);
	let streamError = $state<string | null>(null);
	let isDone = $state(false);
	let abortController: AbortController | null = null;
	let inputEl: HTMLInputElement;

	function cleanResponse(text: string): string {
		let cleaned = text.trim();
		const fencePattern = /^```(?:markdoc|markdown|md)?\s*\n?([\s\S]*?)\n?```\s*$/;
		const match = cleaned.match(fencePattern);
		if (match) {
			cleaned = match[1].trim();
		}
		return cleaned;
	}

	async function handleSend() {
		if (!instruction.trim() || isStreaming) return;

		isStreaming = true;
		isThinking = true;
		accumulated = '';
		previewNode = null;
		inProgressBlocks = [];
		streamError = null;
		isDone = false;
		abortController = new AbortController();

		const messages = [
			{
				role: 'user',
				content: `Refine this Markdoc content block:\n\n\`\`\`markdoc\n${currentSource}\n\`\`\`\n\nRefinement: ${instruction}\n\nRespond with ONLY the refined Markdoc block. Do not include explanation, commentary, or markdown code fences.`,
			},
		];

		try {
			for await (const chunk of streamChat(messages, mode, abortController.signal, null, model)) {
				if (isThinking) isThinking = false;
				accumulated += chunk;
				const result = renderMarkdocSafe(accumulated);
				previewNode = result.renderable;
				inProgressBlocks = result.inProgressBlocks;
			}

			accumulated = cleanResponse(accumulated);
			const finalResult = renderMarkdocSafe(accumulated);
			previewNode = finalResult.renderable;
			inProgressBlocks = [];
			isDone = true;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				accumulated = cleanResponse(accumulated);
				const finalResult = renderMarkdocSafe(accumulated);
				previewNode = finalResult.renderable;
				inProgressBlocks = [];
				isDone = true;
			} else {
				streamError = err instanceof Error ? err.message : String(err);
			}
		} finally {
			isStreaming = false;
			isThinking = false;
		}
	}

	function handleCancel() {
		abortController?.abort();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !isStreaming) handleSend();
		if (e.key === 'Escape') ondiscard();
	}

	onMount(() => {
		inputEl?.focus();
	});

	onDestroy(() => {
		abortController?.abort();
	});
</script>

<div class="refine-panel">
	<div class="refine-panel__toolbar">
		<span class="refine-panel__label">Refine</span>
		<button class="refine-panel__close" onclick={ondiscard} title="Close (Esc)">&times;</button>
	</div>

	<div class="refine-panel__input-area">
		<input
			type="text"
			class="refine-panel__instruction"
			placeholder="Describe how to refine this block..."
			bind:value={instruction}
			bind:this={inputEl}
			disabled={isStreaming}
			onkeydown={handleKeydown}
		/>
		{#if isStreaming}
			<button class="refine-panel__btn refine-panel__btn--cancel" onclick={handleCancel}>
				Cancel
			</button>
		{:else if !isDone}
			<button
				class="refine-panel__btn refine-panel__btn--send"
				onclick={handleSend}
				disabled={!instruction.trim()}
			>
				Refine
			</button>
		{/if}
	</div>

	{#if isThinking}
		<div class="refine-panel__thinking">
			<span class="dot"></span>
			<span class="dot"></span>
			<span class="dot"></span>
		</div>
	{/if}

	{#if streamError}
		<div class="refine-panel__error">{streamError}</div>
	{:else if previewNode || inProgressBlocks.length > 0}
		<div class="refine-panel__preview">
			{#if previewNode}
				<SafeRenderer node={previewNode} {inProgressBlocks} />
			{/if}
		</div>
	{/if}

	{#if isDone && accumulated}
		<div class="refine-panel__actions">
			<button class="refine-panel__action refine-panel__action--accept" onclick={() => onaccept(accumulated)}>
				Accept
			</button>
			<button class="refine-panel__action refine-panel__action--keep-both" onclick={() => onkeepboth(accumulated)}>
				Keep both
			</button>
			<button class="refine-panel__action refine-panel__action--discard" onclick={ondiscard}>
				Discard
			</button>
		</div>
	{/if}
</div>

<style>
	.refine-panel {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.5rem;
		overflow: hidden;
		margin-top: 0.75rem;
		background: var(--rf-color-surface, #ffffff);
	}

	.refine-panel__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.75rem;
		background: var(--rf-color-surface-alt, #f8fafc);
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.refine-panel__label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--rf-color-text-muted, #94a3b8);
	}

	.refine-panel__close {
		background: transparent;
		border: none;
		font-size: 1.125rem;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		line-height: 1;
	}

	.refine-panel__close:hover {
		color: var(--rf-color-text, #1e293b);
		background: var(--rf-color-border, #e2e8f0);
	}

	.refine-panel__input-area {
		display: flex;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.refine-panel__instruction {
		flex: 1;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-family: inherit;
		background: transparent;
		color: inherit;
	}

	.refine-panel__instruction:focus {
		outline: none;
		border-color: var(--rf-color-primary, #0ea5e9);
	}

	.refine-panel__instruction:disabled {
		opacity: 0.6;
	}

	.refine-panel__btn {
		flex-shrink: 0;
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		line-height: 1;
		transition: background 0.1s, color 0.1s;
	}

	.refine-panel__btn--send {
		background: var(--rf-color-primary, #0ea5e9);
		color: #ffffff;
	}

	.refine-panel__btn--send:hover {
		background: var(--rf-color-primary-600, #0284c7);
	}

	.refine-panel__btn--send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.refine-panel__btn--cancel {
		background: var(--rf-color-border, #e2e8f0);
		color: var(--rf-color-text, #1e293b);
	}

	.refine-panel__btn--cancel:hover {
		background: var(--rf-color-text-muted, #94a3b8);
		color: #ffffff;
	}

	.refine-panel__thinking {
		display: flex;
		gap: 0.25rem;
		padding: 1rem 0.75rem;
		justify-content: center;
	}

	.refine-panel__thinking .dot {
		width: 6px;
		height: 6px;
		background: var(--rf-color-text-muted, #94a3b8);
		border-radius: 50%;
		animation: bounce 1.2s ease-in-out infinite;
	}

	.refine-panel__thinking .dot:nth-child(2) {
		animation-delay: 0.15s;
	}

	.refine-panel__thinking .dot:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes bounce {
		0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
		40% { transform: translateY(-4px); opacity: 1; }
	}

	.refine-panel__error {
		margin: 0;
		padding: 0.75rem;
		color: var(--rf-color-danger-700, #b91c1c);
		font-size: 0.8125rem;
	}

	.refine-panel__preview {
		padding: 0.75rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.refine-panel__actions {
		display: flex;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		border-top: 1px solid var(--rf-color-border, #e2e8f0);
		background: var(--rf-color-surface-alt, #f8fafc);
	}

	.refine-panel__action {
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		line-height: 1;
		transition: background 0.1s, color 0.1s;
	}

	.refine-panel__action--accept {
		background: var(--rf-color-primary, #0ea5e9);
		color: #ffffff;
	}

	.refine-panel__action--accept:hover {
		background: var(--rf-color-primary-600, #0284c7);
	}

	.refine-panel__action--keep-both {
		background: var(--rf-color-border, #e2e8f0);
		color: var(--rf-color-text, #1e293b);
	}

	.refine-panel__action--keep-both:hover {
		background: var(--rf-color-text-muted, #94a3b8);
		color: #ffffff;
	}

	.refine-panel__action--discard {
		background: transparent;
		color: var(--rf-color-text-muted, #94a3b8);
	}

	.refine-panel__action--discard:hover {
		color: var(--rf-color-danger-700, #b91c1c);
		background: var(--rf-color-danger-50, #fef2f2);
	}
</style>
