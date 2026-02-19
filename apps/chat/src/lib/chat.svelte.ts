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
import type { RendererNode, DesignTokens } from '@refrakt-md/types';
import { scanInProgressBlocks, type InProgressBlock } from './block-scanner.js';
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

/** Strip outer code fence if the AI wrapped its rune output in one. */
function stripCodeFence(text: string): string {
	const match = text.match(/^```(?:markdoc|markdown|md|html)?\s*\n([\s\S]*?)\n```\s*$/);
	return match ? match[1] : text;
}

/** Auto-close any rune tags left open (e.g. when AI hit token limit). */
function closeUnclosedTags(text: string): string {
	const open = scanInProgressBlocks(text);
	if (open.length === 0) return text;
	// Close in reverse order (innermost first)
	const closers = open.reverse().map((b) => `{% /${b.tagName} %}`).join('\n');
	return text + '\n' + closers;
}

/** Walk a renderable tree to find DesignContext tokens meta tag. */
function extractDesignTokensFromTree(node: RendererNode): DesignTokens | null {
	if (!node || typeof node !== 'object') return null;
	const tag = node as Record<string, any>;

	// Check if this is a DesignContext node
	if (tag.attributes?.typeof === 'DesignContext' && Array.isArray(tag.children)) {
		for (const child of tag.children) {
			if (child?.name === 'meta' && child?.attributes?.property === 'tokens') {
				try {
					return JSON.parse(child.attributes.content);
				} catch {
					return null;
				}
			}
		}
	}

	// Recurse into children
	if (Array.isArray(tag.children)) {
		for (const child of tag.children) {
			const found = extractDesignTokensFromTree(child);
			if (found) return found;
		}
	}

	return null;
}

/** Scan all messages for the most recent design-context tokens. */
function scanMessagesForTokens(msgs: ChatMessage[]): DesignTokens | null {
	// Walk backwards to find the most recent design-context
	for (let i = msgs.length - 1; i >= 0; i--) {
		const msg = msgs[i];
		if (msg.renderable) {
			const tokens = extractDesignTokensFromTree(msg.renderable);
			if (tokens) return tokens;
		}
	}
	return null;
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
	let activeDesignTokens = $state<DesignTokens | null>(null);

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
		activeDesignTokens = scanMessagesForTokens(messages);
		scrollTick++;
	}

	async function newConversation() {
		if (isStreaming) return;
		activeConversationId = null;
		conversationMode = null;
		activeDesignTokens = null;
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
			for await (const chunk of streamChat(history, effectiveMode, abortController.signal, activeDesignTokens)) {
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

			// Strip code fence wrapper if the AI wrapped its output in one
			accumulated = stripCodeFence(accumulated);
			// Auto-close rune tags left open (e.g. AI hit token limit)
			accumulated = closeUnclosedTags(accumulated);
			assistantMsg.content = accumulated;

			// Final render with complete content
			const finalResult = renderMarkdocSafe(accumulated);
			for (const err of finalResult.errors) {
				console.warn('[refrakt-chat] Final render issue:', err);
			}
			assistantMsg.renderable = finalResult.renderable ?? undefined;
			assistantMsg.inProgressBlocks = [];
			assistantMsg.degraded = finalResult.degraded;

			// Check for design tokens in the new message
			if (assistantMsg.renderable) {
				const newTokens = extractDesignTokensFromTree(assistantMsg.renderable);
				if (newTokens) activeDesignTokens = newTokens;
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// User cancelled — keep partial content, no error
				if (accumulated) {
					accumulated = stripCodeFence(accumulated);
					accumulated = closeUnclosedTags(accumulated);
					assistantMsg.content = accumulated;
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
		get activeDesignTokens() {
			return activeDesignTokens;
		},
		init,
		send,
		cancel,
		newConversation,
		switchConversation,
		deleteConversation,
	};
}
