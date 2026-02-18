<script lang="ts">
	import { onMount } from 'svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import { createChat } from '$lib/chat.svelte.js';

	const chat = createChat();

	let inputValue = $state('');
	let messagesEl: HTMLElement;

	onMount(() => {
		chat.init();
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!inputValue.trim() || chat.isStreaming) return;
		const msg = inputValue;
		inputValue = '';
		await chat.send(msg);
	}

	$effect(() => {
		// Subscribe to both new messages and streaming content growth
		const _ = [chat.messages.length, chat.scrollTick];
		if (messagesEl) {
			messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
		}
	});
</script>

<svelte:head>
	{#if chat.highlightCss}
		{@html `<style>${chat.highlightCss}</style>`}
	{/if}
</svelte:head>

<div class="chat-container">
	<header class="chat-header">
		<h1>chat.refrakt.md</h1>
	</header>

	<div class="messages" bind:this={messagesEl}>
		{#if chat.messages.length === 0}
			<div class="empty-state">
				<p>Ask anything. Responses are rendered with rich, interactive runes.</p>
				<p class="hint">Try: "Good pasta carbonara recipe?" or "Compare React vs Svelte"</p>
			</div>
		{/if}

		{#each chat.messages as message}
			<div class="message message--{message.role}">
				{#if message.role === 'user'}
					<div class="user-bubble">
						<p>{message.content}</p>
					</div>
				{:else if message.error}
					<div class="error-bubble">
						<p>Error: {message.error}</p>
					</div>
				{:else if message.renderable}
					<div class="assistant-content">
						<Renderer node={message.renderable} />
					</div>
				{:else if message.content}
					<div class="assistant-content">
						<p class="raw-text">{message.content}</p>
					</div>
				{/if}
			</div>
		{/each}

		{#if chat.isThinking}
			<div class="thinking-indicator">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>
		{/if}
	</div>

	<form class="input-bar" onsubmit={handleSubmit}>
		<input
			type="text"
			bind:value={inputValue}
			placeholder="Ask something..."
			disabled={chat.isStreaming}
		/>
		{#if chat.isStreaming}
			<button type="button" class="cancel-btn" onclick={() => chat.cancel()}>
				Cancel
			</button>
		{:else}
			<button type="submit" disabled={!inputValue.trim()}>
				Send
			</button>
		{/if}
	</form>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		max-width: 860px;
		margin: 0 auto;
	}

	.chat-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.chat-header h1 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--rf-color-text-muted, #64748b);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-state .hint {
		font-size: 0.875rem;
		font-style: italic;
	}

	.message {
		margin-bottom: 1.5rem;
	}

	.message--user {
		display: flex;
		justify-content: flex-end;
	}

	.user-bubble {
		display: inline-block;
		max-width: 70%;
		background: var(--rf-color-primary-100, #e0f2fe);
		color: var(--rf-color-primary-900, #0c4a6e);
		padding: 0.5rem 1rem;
		border-radius: 1rem 1rem 0.25rem 1rem;
	}

	.user-bubble p {
		margin: 0;
	}

	.error-bubble {
		background: var(--rf-color-danger-50, #fef2f2);
		color: var(--rf-color-danger-700, #b91c1c);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--rf-color-danger-200, #fecaca);
	}

	.error-bubble p {
		margin: 0;
	}

	.assistant-content {
		max-width: 100%;
	}

	.raw-text {
		white-space: pre-wrap;
	}

	.thinking-indicator {
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem 0;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--rf-color-text-muted, #94a3b8);
		animation: bounce 1.4s infinite ease-in-out;
	}

	.dot:nth-child(1) { animation-delay: 0s; }
	.dot:nth-child(2) { animation-delay: 0.2s; }
	.dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes bounce {
		0%, 80%, 100% { transform: scale(0); }
		40% { transform: scale(1); }
	}

	.input-bar {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--rf-color-border, #e2e8f0);
		background: var(--rf-color-surface, #ffffff);
	}

	.input-bar input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		background: transparent;
		color: inherit;
	}

	.input-bar input:focus {
		outline: none;
		border-color: var(--rf-color-primary, #0ea5e9);
		box-shadow: 0 0 0 2px var(--rf-color-primary-100, #e0f2fe);
	}

	.input-bar button {
		padding: 0.75rem 1.5rem;
		background: var(--rf-color-primary, #0ea5e9);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}

	.input-bar button:hover:not(:disabled) {
		background: var(--rf-color-primary-600, #0284c7);
	}

	.input-bar button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-btn {
		background: transparent;
		color: var(--rf-color-danger-700, #b91c1c);
		border: 1px solid var(--rf-color-danger-300, #fca5a5);
	}

	.cancel-btn:hover {
		background: var(--rf-color-danger-50, #fef2f2);
	}
</style>
