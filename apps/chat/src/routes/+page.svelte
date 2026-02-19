<script lang="ts">
	import { onMount } from 'svelte';
	import SafeRenderer from '$lib/SafeRenderer.svelte';
	import MessageToolbar from '$lib/MessageToolbar.svelte';
	import PagePanel from '$lib/PagePanel.svelte';
	import { createChat } from '$lib/chat.svelte.js';
	import { createPageStore } from '$lib/page.svelte.js';
	import { extractBlocks } from '$lib/blocks.js';
	import { CHAT_MODE_LIST } from '@refrakt-md/ai';

	const chat = createChat();
	const pageStore = createPageStore();

	let inputValue = $state('');
	let messagesEl: HTMLElement;
	let sidebarOpen = $state(false);

	onMount(() => {
		chat.init();
	});

	// Load page state when conversation changes
	$effect(() => {
		pageStore.loadForConversation(chat.activeConversationId);
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

	function isCompletedAssistant(message: typeof chat.messages[0], index: number): boolean {
		// Show toolbar only for completed assistant messages (not the one currently streaming)
		if (message.role !== 'user' && message.renderable && !message.error) {
			if (chat.isStreaming && index === chat.messages.length - 1) return false;
			return true;
		}
		return false;
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

<div class="app-shell">
	<header class="titlebar">
		<button class="menu-btn" onclick={() => sidebarOpen = !sidebarOpen} title="Toggle sidebar">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
		<h1>chat.refrakt.md</h1>
		{#if chat.isModeLocked}
			<span class="mode-badge" title="Mode is locked for this conversation">
				{CHAT_MODE_LIST.find(m => m.id === chat.effectiveMode)?.label ?? chat.effectiveMode}
			</span>
		{/if}
		{#if chat.availableModels.length > 1}
			<select
				class="model-select"
				value={chat.effectiveModel}
				onchange={(e) => chat.setModel(e.currentTarget.value)}
				disabled={chat.isStreaming}
				title="Select AI model"
			>
				{#each chat.availableModels as model}
					<option value={model.id}>{model.label}</option>
				{/each}
			</select>
		{/if}
		<button
			class="page-toggle-btn"
			onclick={() => pageStore.toggle()}
			title={pageStore.isOpen ? 'Close page panel' : 'Open page panel'}
			class:page-toggle-btn--active={pageStore.isOpen}
		>
			<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
				<rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
			</svg>
			{#if pageStore.pinCount > 0}
				<span class="page-toggle-badge">{pageStore.pinCount}</span>
			{/if}
		</button>
	</header>

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
			<div class="messages" bind:this={messagesEl}>
			{#if chat.messages.length === 0}
				<div class="mode-picker">
					<div class="mode-picker__header">
						<h2 class="mode-picker__title">What are you working on?</h2>
						<p class="mode-picker__subtitle">
							Each mode unlocks specialized runes that shape how the AI responds.
							Pick the one that fits your task.
						</p>
					</div>
					<div class="mode-picker__grid">
						{#each CHAT_MODE_LIST as mode}
							<button
								class="mode-card"
								class:mode-card--selected={chat.selectedMode === mode.id}
								onclick={() => chat.selectedMode = mode.id}
							>
								<span class="mode-card__label">{mode.label}</span>
								<span class="mode-card__description">{mode.description}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#each chat.messages as message, i}
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
						{#if isCompletedAssistant(message, i)}
							<MessageToolbar
								blocks={extractBlocks(message.renderable, i)}
								messageIndex={i}
								messageContent={message.content}
								{pageStore}
							/>
						{/if}
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

		{#if pageStore.isOpen}
			<PagePanel {pageStore} mode={chat.effectiveMode} model={chat.effectiveModel} />
		{/if}
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	/* Fixed titlebar */
	.titlebar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
		background: var(--rf-color-surface, #ffffff);
		flex-shrink: 0;
		z-index: 20;
	}

	.titlebar h1 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.app-layout {
		display: flex;
		flex: 1;
		min-height: 0;
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
		min-width: 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	/* Center message content within the chat container */
	.message {
		max-width: 640px;
		margin-left: auto;
		margin-right: auto;
		width: 100%;
	}

	.mode-picker {
		max-width: 640px;
		margin-left: auto;
		margin-right: auto;
	}

	.input-bar {
		max-width: 640px;
		margin-left: auto;
		margin-right: auto;
		width: 100%;
	}

	/* When page panel is not open, widen content */
	.app-layout:not(:has(.page-panel)) .message,
	.app-layout:not(:has(.page-panel)) .mode-picker,
	.app-layout:not(:has(.page-panel)) .input-bar {
		max-width: 860px;
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

	.mode-badge {
		margin-left: auto;
		padding: 0.25rem 0.625rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		background: var(--rf-color-surface-alt, #f8fafc);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--rf-color-text-muted, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	/* Push model selector to the right when no mode badge */
	.model-select {
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		background: var(--rf-color-surface, #ffffff);
		font-size: 0.75rem;
		font-family: inherit;
		font-weight: 500;
		color: var(--rf-color-text-muted, #64748b);
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		padding-right: 1.25rem;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.375rem center;
	}

	.model-select:hover {
		border-color: var(--rf-color-primary, #0ea5e9);
	}

	.model-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* When mode badge is present, don't push model selector */
	.mode-badge + .model-select {
		margin-left: 0;
	}

	/* Page toggle button */
	.page-toggle-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		background: transparent;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		color: var(--rf-color-text-muted, #64748b);
		cursor: pointer;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}

	.page-toggle-btn:hover {
		background: var(--rf-color-surface-alt, #f8fafc);
		color: var(--rf-color-text, #1e293b);
	}

	.page-toggle-btn--active {
		border-color: var(--rf-color-primary, #0ea5e9);
		color: var(--rf-color-primary, #0ea5e9);
	}

	.page-toggle-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		background: var(--rf-color-primary, #0ea5e9);
		color: white;
		font-size: 0.625rem;
		font-weight: 700;
		line-height: 16px;
		text-align: center;
		border-radius: 8px;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem 1rem;
	}

	.mode-picker {
		padding: 2.5rem 1rem 1.5rem;
	}

	.mode-picker__header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.mode-picker__title {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--rf-color-text, #1e293b);
	}

	.mode-picker__subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: var(--rf-color-text-muted, #64748b);
		line-height: 1.5;
	}

	.mode-picker__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.mode-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.375rem;
		padding: 0.875rem 1rem;
		background: var(--rf-color-surface, #ffffff);
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.5rem;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: inherit;
		transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
	}

	.mode-card:hover {
		border-color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-surface-alt, #f8fafc);
	}

	.mode-card--selected {
		border-color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-primary-50, #f0f9ff);
		box-shadow: 0 0 0 1px var(--rf-color-primary, #0ea5e9);
	}

	.mode-card--selected:hover {
		background: var(--rf-color-primary-50, #f0f9ff);
	}

	.mode-card__label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--rf-color-text, #1e293b);
	}

	.mode-card--selected .mode-card__label {
		color: var(--rf-color-primary-700, #0369a1);
	}

	.mode-card__description {
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--rf-color-text-muted, #64748b);
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

		.chat-container {
			width: auto;
			min-width: 0;
			flex: 1;
		}
	}
</style>
