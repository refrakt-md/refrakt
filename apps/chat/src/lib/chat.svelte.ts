import { renderMarkdoc, renderMarkdocSafe, initHighlight, getHighlightCss } from './pipeline.js';
import { streamChat } from './stream.js';
import {
	createConversation,
	listConversations,
	deleteConversation as dbDeleteConversation,
	saveMessage,
	updateLastMessage,
	loadMessages,
	updateConversationTitle,
	type StoredConversation,
} from './db.js';
import type { RendererNode } from '@refrakt-md/types';
import type { InProgressBlock } from './block-scanner.js';
import type { ChatMode } from '@refrakt-md/ai';

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	renderable?: RendererNode;
	inProgressBlocks?: InProgressBlock[];
	degraded?: boolean;
	error?: string;
}

function truncateTitle(text: string, max = 50): string {
	return text.length > max ? text.slice(0, max) + '...' : text;
}

export function createChat() {
	let messages = $state<ChatMessage[]>([]);
	let conversations = $state<StoredConversation[]>([]);
	let activeConversationId = $state<string | null>(null);
	let isStreaming = $state(false);
	let isThinking = $state(false);
	let highlightReady = $state(false);
	let scrollTick = $state(0);
	let abortController: AbortController | null = null;
	let selectedMode = $state<ChatMode>('general');
	let conversationMode = $state<ChatMode | null>(null);

	async function init() {
		await initHighlight();
		highlightReady = true;

		// Load conversation list and restore most recent
		conversations = await listConversations();
		if (conversations.length > 0) {
			await switchConversation(conversations[0].id);
		}
	}

	async function switchConversation(id: string) {
		if (isStreaming) return;
		activeConversationId = id;
		const conv = conversations.find((c) => c.id === id);
		conversationMode = (conv?.mode as ChatMode) ?? 'general';
		const stored = await loadMessages(id);
		messages = stored.map((m) => {
			const msg: ChatMessage = { role: m.role, content: m.content };
			if (m.role === 'assistant' && m.content) {
				try {
					msg.renderable = renderMarkdoc(m.content);
				} catch {
					// Failed to parse — raw text fallback
				}
			}
			return msg;
		});
		scrollTick++;
	}

	async function newConversation() {
		if (isStreaming) return;
		activeConversationId = null;
		conversationMode = null;
		messages = [];
	}

	async function deleteConversation(id: string) {
		if (isStreaming) return;
		await dbDeleteConversation(id);
		conversations = await listConversations();
		if (activeConversationId === id) {
			if (conversations.length > 0) {
				await switchConversation(conversations[0].id);
			} else {
				activeConversationId = null;
				messages = [];
			}
		}
	}

	async function send(userMessage: string) {
		// Lock mode and create conversation on first message if needed
		if (!activeConversationId) {
			conversationMode = selectedMode;
			const conv = await createConversation(truncateTitle(userMessage), selectedMode);
			activeConversationId = conv.id;
			conversations = await listConversations();
		}

		const convId = activeConversationId!;

		// Add user message
		messages.push({ role: 'user', content: userMessage });
		await saveMessage(convId, { role: 'user', content: userMessage });

		// Auto-title: if this is the first user message, set title
		const userMessages = messages.filter((m) => m.role === 'user');
		if (userMessages.length === 1) {
			await updateConversationTitle(convId, truncateTitle(userMessage));
			conversations = await listConversations();
		}

		isStreaming = true;
		isThinking = true;
		scrollTick = 0;
		abortController = new AbortController();

		// Build history for the AI
		const history = messages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => ({ role: m.role, content: m.content }));

		// Add placeholder for assistant response — access through the array
		// so mutations go through the $state proxy and trigger UI updates
		messages.push({ role: 'assistant', content: '' });
		await saveMessage(convId, { role: 'assistant', content: '' });
		const assistantMsg = messages[messages.length - 1];

		let accumulated = '';

		const effectiveMode = conversationMode ?? selectedMode;

		try {
			for await (const chunk of streamChat(history, effectiveMode, abortController.signal)) {
				if (isThinking) isThinking = false;
				accumulated += chunk;
				assistantMsg.content = accumulated;
				scrollTick++;

				// Render with graceful degradation — never throws
				const result = renderMarkdocSafe(accumulated);
				for (const err of result.errors) {
					console.warn('[refrakt-chat] Render degradation:', err);
				}
				if (result.renderable) {
					assistantMsg.renderable = result.renderable;
				}
				assistantMsg.inProgressBlocks = result.inProgressBlocks;
				assistantMsg.degraded = result.degraded;
			}

			// Final render with complete content
			const finalResult = renderMarkdocSafe(accumulated);
			for (const err of finalResult.errors) {
				console.warn('[refrakt-chat] Final render issue:', err);
			}
			assistantMsg.renderable = finalResult.renderable ?? undefined;
			assistantMsg.inProgressBlocks = [];
			assistantMsg.degraded = finalResult.degraded;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// User cancelled — keep partial content, no error
				if (accumulated) {
					const result = renderMarkdocSafe(accumulated);
					assistantMsg.renderable = result.renderable ?? undefined;
					assistantMsg.inProgressBlocks = [];
				}
			} else {
				assistantMsg.error =
					err instanceof Error ? err.message : 'An error occurred';
			}
		} finally {
			// Persist final assistant content
			if (accumulated) {
				await updateLastMessage(convId, accumulated);
				conversations = await listConversations();
			}
			isStreaming = false;
			isThinking = false;
			abortController = null;
		}
	}

	function cancel() {
		abortController?.abort();
	}

	return {
		get messages() {
			return messages;
		},
		get conversations() {
			return conversations;
		},
		get activeConversationId() {
			return activeConversationId;
		},
		get isStreaming() {
			return isStreaming;
		},
		get isThinking() {
			return isThinking;
		},
		get highlightReady() {
			return highlightReady;
		},
		get highlightCss() {
			return getHighlightCss();
		},
		get scrollTick() {
			return scrollTick;
		},
		get selectedMode() {
			return selectedMode;
		},
		set selectedMode(m: ChatMode) {
			selectedMode = m;
		},
		get effectiveMode(): ChatMode {
			return conversationMode ?? selectedMode;
		},
		get isModeLocked() {
			return conversationMode !== null;
		},
		init,
		send,
		cancel,
		newConversation,
		switchConversation,
		deleteConversation,
	};
}
