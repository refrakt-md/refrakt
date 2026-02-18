<script lang="ts">
	import { onMount } from 'svelte';
	import SafeRenderer from '$lib/SafeRenderer.svelte';
	import { createChat } from '$lib/chat.svelte.js';
	import { CHAT_MODE_LIST } from '@refrakt-md/ai';

	const chat = createChat();

	let inputValue = $state('');
	let messagesEl: HTMLElement;
	let sidebarOpen = $state(false);

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

	function handleNewChat() {
		chat.newConversation();
		sidebarOpen = false;
	}

	function handleSwitchConversation(id: string) {
		chat.switchConversation(id);
		sidebarOpen = false;
	}

	function handleDeleteConversation(e: MouseEvent, id: string) {
		e.stopPropagation();
		chat.deleteConversation(id);
	}

	function formatTime(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(timestamp).toLocaleDateString();
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if sidebarOpen}
	<div class="sidebar-overlay" onclick={() => sidebarOpen = false} onkeydown={() => {}}></div>
{/if}

<div class="app-layout">
	<aside class="sidebar" class:sidebar--open={sidebarOpen}>
		<div class="sidebar__header">
			<button class="new-chat-btn" onclick={handleNewChat}>
				+ New Chat
			</button>
		</div>
		<nav class="sidebar__list">
			{#each chat.conversations as conv}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="conv-item"
					class:conv-item--active={conv.id === chat.activeConversationId}
					onclick={() => handleSwitchConversation(conv.id)}
					onkeydown={() => {}}
					role="button"
					tabindex="0"
				>
					<span class="conv-item__title">{conv.title}</span>
					{#if conv.mode}
						<span class="conv-item__mode">{conv.mode}</span>
					{/if}
					<span class="conv-item__time">{formatTime(conv.updatedAt)}</span>
					<button
						class="conv-item__delete"
						onclick={(e) => handleDeleteConversation(e, conv.id)}
						title="Delete conversation"
					>
						&times;
					</button>
				</div>
			{/each}
			{#if chat.conversations.length === 0}
				<p class="sidebar__empty">No conversations yet</p>
			{/if}
		</nav>
	</aside>

	<div class="chat-container">
		<header class="chat-header">
			<button class="menu-btn" onclick={() => sidebarOpen = !sidebarOpen} title="Toggle sidebar">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
			<h1>chat.refrakt.md</h1>
			<select
				class="mode-select"
				value={chat.selectedMode}
				onchange={(e) => chat.selectedMode = e.currentTarget.value as any}
				disabled={chat.isModeLocked || chat.isStreaming}
				title={chat.isModeLocked ? 'Mode is locked for this conversation' : 'Select conversation mode'}
			>
				{#each CHAT_MODE_LIST as mode}
					<option value={mode.id}>{mode.label}</option>
				{/each}
			</select>
		</header>

		<div class="messages" bind:this={messagesEl}>
			{#if chat.messages.length === 0}
				<div class="empty-state">
					<p>Ask anything. Responses are rendered with rich, interactive runes.</p>
					<p class="mode-description">{CHAT_MODE_LIST.find(m => m.id === chat.effectiveMode)?.description ?? ''}</p>
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
							<SafeRenderer
								node={message.renderable}
								inProgressBlocks={message.inProgressBlocks ?? []}
							/>
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
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	/* Sidebar */
	.sidebar {
		width: 260px;
		min-width: 260px;
		background: var(--rf-color-surface-alt, #f8fafc);
		border-right: 1px solid var(--rf-color-border, #e2e8f0);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar__header {
		padding: 0.75rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.new-chat-btn {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--rf-color-primary, #0ea5e9);
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}

	.new-chat-btn:hover {
		background: var(--rf-color-primary-600, #0284c7);
	}

	.sidebar__list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.sidebar__empty {
		text-align: center;
		color: var(--rf-color-text-muted, #94a3b8);
		font-size: 0.8125rem;
		padding: 1rem;
	}

	.conv-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		width: 100%;
		padding: 0.5rem 0.625rem;
		margin-bottom: 2px;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: inherit;
		transition: background 0.1s;
		position: relative;
	}

	.conv-item:hover {
		background: var(--rf-color-border, #e2e8f0);
	}

	.conv-item--active {
		background: var(--rf-color-primary-100, #e0f2fe);
	}

	.conv-item--active:hover {
		background: var(--rf-color-primary-100, #e0f2fe);
	}

	.conv-item__title {
		flex: 1;
		font-size: 0.8125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.conv-item__mode {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--rf-color-primary, #0ea5e9);
		flex-shrink: 0;
	}

	.conv-item__time {
		font-size: 0.6875rem;
		color: var(--rf-color-text-muted, #94a3b8);
		margin-left: 0.5rem;
		flex-shrink: 0;
	}

	.conv-item__delete {
		display: none;
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: var(--rf-color-text-muted, #94a3b8);
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 0.25rem;
	}

	.conv-item:hover .conv-item__delete {
		display: block;
	}

	.conv-item__delete:hover {
		color: var(--rf-color-danger-700, #b91c1c);
		background: var(--rf-color-danger-50, #fef2f2);
	}

	/* Sidebar overlay for mobile */
	.sidebar-overlay {
		display: none;
	}

	/* Chat container */
	.chat-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		max-width: 860px;
	}

	.chat-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.menu-btn {
		display: none;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
	}

	.menu-btn:hover {
		background: var(--rf-color-border, #e2e8f0);
	}

	.chat-header h1 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.mode-select {
		margin-left: auto;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		background: transparent;
		color: inherit;
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
	}

	.mode-select:focus {
		outline: none;
		border-color: var(--rf-color-primary, #0ea5e9);
	}

	.mode-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	.empty-state .mode-description {
		font-size: 0.875rem;
		color: var(--rf-color-text-muted, #94a3b8);
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

	/* Mobile: sidebar as overlay drawer */
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			z-index: 100;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
		}

		.sidebar--open {
			transform: translateX(0);
		}

		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 99;
			background: rgba(0, 0, 0, 0.3);
		}

		.menu-btn {
			display: block;
		}
	}
</style>
